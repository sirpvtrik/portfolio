// Teljes képernyős négyszög: a csúcsok közvetlenül clip-térben (hullám, blit, lejátszó)

export const fullscreenVS = 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }';

// a render target kirajzolása a képernyőre
export const blitFS = 'uniform sampler2D uTex; uniform vec2 uRes; void main() { gl_FragColor = texture2D(uTex, gl_FragCoord.xy / uRes); }';
