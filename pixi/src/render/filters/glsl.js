/** Pixi 滤镜共用 GLSL（WebGL） */
export const FILTER_VERT = `in vec2 aPosition;
out vec2 vTextureCoord;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;
vec4 filterVertexPosition( void )
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
    return vec4(position, 0.0, 1.0);
}
vec2 filterTextureCoord( void )
{
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}
void main(void)
{
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}`;

export const LIGHT_COMPOSITE_FRAG = `in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform sampler2D uMultiply;
uniform sampler2D uAdd;
uniform float uMinBright;
uniform float uIsCharacter;
void main() {
    vec4 base = texture(uTexture, vTextureCoord);
    vec3 mul = texture(uMultiply, vTextureCoord).rgb;
    vec3 add = texture(uAdd, vTextureCoord).rgb;
    vec3 lit = base.rgb * mul + base.rgb * add;
    if (uIsCharacter > 0.5) {
        lit = max(lit, base.rgb * uMinBright);
    }
    finalColor = vec4(lit, base.a);
}`;

export const HIT_FLASH_FRAG = `in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform float uFlash;
void main() {
    vec4 c = texture(uTexture, vTextureCoord);
    vec3 flash = vec3(1.0);
    finalColor = vec4(mix(c.rgb, flash, uFlash * c.a), c.a);
}`;

export const VIGNETTE_FRAG = `in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform float uStrength;
uniform vec3 uTint;
void main() {
    vec4 c = texture(uTexture, vTextureCoord);
    vec2 uv = vTextureCoord - 0.5;
    float d = dot(uv, uv);
    float vig = smoothstep(0.2, 0.85, d * 1.6);
    vec3 col = mix(c.rgb, c.rgb * (1.0 - uTint), vig * uStrength);
    finalColor = vec4(col, c.a);
}`;

export const CHROMATIC_FRAG = `in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform float uAmount;
uniform vec2 uDir;
void main() {
    vec2 off = uDir * uAmount * 0.012;
    float r = texture(uTexture, vTextureCoord + off).r;
    float g = texture(uTexture, vTextureCoord).g;
    float b = texture(uTexture, vTextureCoord - off).b;
    float a = texture(uTexture, vTextureCoord).a;
    finalColor = vec4(r, g, b, a);
}`;

export const RADIAL_BLUR_FRAG = `in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform vec2 uCenter;
uniform float uStrength;
void main() {
    vec4 sharp = texture(uTexture, vTextureCoord);
    if (uStrength <= 0.001) {
        finalColor = sharp;
        return;
    }
    vec2 dir = uCenter - vTextureCoord;
    vec4 acc = vec4(0.0);
    float wsum = 0.0;
    for (int i = 0; i < 8; i++) {
        float t = float(i) / 7.0;
        float w = 1.0 - t * 0.65;
        acc += texture(uTexture, vTextureCoord + dir * t * uStrength * 0.05) * w;
        wsum += w;
    }
    vec4 blurred = acc / wsum;
    vec2 uv = vTextureCoord;
    float edge = max(abs(uv.x - 0.5), abs(uv.y - 0.5)) * 2.0;
    float edgeMask = smoothstep(0.35, 0.92, edge);
    finalColor = mix(sharp, blurred, edgeMask * uStrength);
}`;

export const DAMAGE_EDGE_FRAG = `in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform float uAmount;
void main() {
    vec4 c = texture(uTexture, vTextureCoord);
    vec2 uv = vTextureCoord;
    float edge = max(abs(uv.x - 0.5), abs(uv.y - 0.5)) * 2.0;
    float red = smoothstep(0.65, 1.0, edge) * uAmount;
    finalColor = vec4(c.rgb + vec3(red * 0.35, 0.0, 0.0), c.a);
}`;

export const BLOOM_COMBINE_FRAG = `in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform sampler2D uBloom;
uniform float uStrength;
void main() {
    vec4 base = texture(uTexture, vTextureCoord);
    vec3 bloom = texture(uBloom, vTextureCoord).rgb;
    finalColor = vec4(base.rgb + bloom * uStrength, base.a);
}`;
