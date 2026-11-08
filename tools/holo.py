"""Hologram-videó készítése: háttér kivágás (MediaPipe), kontraszt, ál-mélység → 3 sávos szürke videó (fény | maszk | mélység)."""
import subprocess, sys, json, numpy as np, cv2
import mediapipe as mp
from mediapipe.tasks import python as mpt
from mediapipe.tasks.python import vision

SRC, MODEL, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
PW, PH, FPS = 360, 640, 30
IW, IH = 540, 960
# szegmensek: (név, kezdet, vég, oda-vissza?)
SEGS = json.loads(sys.argv[4])

opts = vision.ImageSegmenterOptions(
    base_options=mpt.BaseOptions(model_asset_path=MODEL),
    running_mode=vision.RunningMode.VIDEO, output_confidence_masks=True, output_category_mask=False)
seg = vision.ImageSegmenter.create_from_options(opts)
clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(6, 10))
ts = [0]

def frames(t0, t1):
    cmd = ['ffmpeg', '-v', 'error', '-ss', str(t0), '-t', str(t1 - t0), '-i', SRC,
           '-vf', f'fps={FPS},scale={IW}:{IH}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    n = IW * IH * 3
    while True:
        b = p.stdout.read(n)
        if len(b) < n: break
        yield np.frombuffer(b, np.uint8).reshape(IH, IW, 3)
    p.wait()

prev = None
def process(rgb):
    global prev
    ts[0] += 33
    r = seg.segment_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb)), ts[0])
    bg = r.confidence_masks[0].numpy_view().astype(np.float32)
    m = cv2.resize(1.0 - bg, (PW, PH), interpolation=cv2.INTER_LINEAR)
    m = np.clip((m - 0.35) / 0.4, 0, 1)                              # élesebb, de puha szélű maszk
    # lyukak kitöltése (pl. a póló sötét feliratánál a modell bizonytalan)
    mb = (m > 0.5).astype(np.uint8)
    mb = cv2.morphologyEx(mb, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    ff = mb.copy(); cv2.floodFill(ff, np.zeros((PH + 2, PW + 2), np.uint8), (0, 0), 1)
    holes = (ff == 0)
    m = np.maximum(m, cv2.GaussianBlur((holes | (mb > 0)).astype(np.float32), (0, 0), 1.2) * (holes | (mb > 0)))
    # a megvilágított, testhez kapcsolódó világos részek (pl. kinyújtott kéz) is maradjanak
    raw = cv2.cvtColor(cv2.resize(rgb, (PW, PH), interpolation=cv2.INTER_AREA), cv2.COLOR_RGB2GRAY)
    bright = (cv2.GaussianBlur(raw, (0, 0), 1.5) > 38).astype(np.uint8)
    near = cv2.dilate((m > 0.5).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41)))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(bright & near, 8)
    keep = np.zeros_like(bright)
    body = (m > 0.5)
    for k in range(1, n):
        comp = lab == k
        if stats[k, cv2.CC_STAT_AREA] > 60 and (comp & cv2.dilate(body.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)).any():
            keep |= comp.astype(np.uint8)
    m = np.maximum(m, cv2.GaussianBlur(keep.astype(np.float32), (0, 0), 1.5))
    if prev is not None: m = prev * 0.45 + m * 0.55                  # időbeli simítás → nem vibrál
    prev = m
    g = cv2.cvtColor(cv2.resize(rgb, (PW, PH), interpolation=cv2.INTER_AREA), cv2.COLOR_RGB2GRAY)
    g = clahe.apply(g)
    g = np.clip((g.astype(np.float32) - 8) * 1.35, 0, 255)
    # ál-mélység: a sziluett belseje „domborodik” ki, a szélek hátrébb vannak
    dt = cv2.distanceTransform((m > 0.5).astype(np.uint8), cv2.DIST_L2, 5)
    dt = np.sqrt(dt / (dt.max() + 1e-6))
    dt = cv2.GaussianBlur(dt, (0, 0), 6)
    out = np.concatenate([g, m * 255, dt * 255 * (m > 0.02)], axis=1).astype(np.uint8)
    return out

enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', f'{PW*3}x{PH}', '-r', str(FPS), '-i', '-',
                        '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-pix_fmt', 'yuv420p', '-g', '15', '-movflags', '+faststart', '-an', OUT],
                       stdin=subprocess.PIPE)
table, t = {}, 0.0
for name, t0, t1, pp in SEGS:
    prev = None
    buf = [process(f) for f in frames(t0, t1)]
    seq = buf + buf[-2:0:-1] if pp else buf
    for f in seq: enc.stdin.write(f.tobytes())
    table[name] = [round(t, 3), round(t + len(seq) / FPS, 3)]
    t += len(seq) / FPS
    print(name, len(seq), 'frames', file=sys.stderr)
enc.stdin.close(); enc.wait()
print(json.dumps(table))
