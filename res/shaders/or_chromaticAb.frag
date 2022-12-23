// Chromatic Aberration shader written by hashikemu/karuua

#ifdef OPENGL_ES
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
#else
precision mediump float;
#endif



///////////////////////////////////////////////////////////
// Uniforms
uniform sampler2D u_texture;
uniform float u_aberrationSize;

///////////////////////////////////////////////////////////
// Varyings
varying vec2 v_texCoord;
varying vec4 v_color;



void main(){
    // 変数定義
    vec4 color;
    color = texture2D(u_texture, v_texCoord);
    
    vec2 uvBase = v_texCoord - 0.5;

    // R値を拡大したものに置き換える
    vec2 uvR = uvBase * (1.0 - u_aberrationSize * 2.0) + 0.5;
    color.r = texture2D(u_texture, uvR).r;

    // G値を拡大したものに置き換える
    vec2 uvG = uvBase * (1.0 - u_aberrationSize) + 0.5;
    color.g = texture2D(u_texture, uvG).g;

    // color.r=v_texCoord.x;
    // color.g=v_texCoord.y;

    // 最終的な色をgl_FragColorに出力
    gl_FragColor = color;
}