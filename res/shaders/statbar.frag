#ifdef OPENGL_ES
#extension GL_OES_standard_derivatives : enable
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
#else
precision mediump float;
#endif

const float PI = 3.14159;

///////////////////////////////////////////////////////////
// Uniforms
uniform sampler2D   u_diffuseTexture;   // 背景テクスチャ
uniform float       u_barRatio;          // バー表示率(0.0~1.0)
uniform vec4        u_barColor;          // バー表示色(rgba，加算合成する)

///////////////////////////////////////////////////////////
// Variables
vec4 _baseColor;
vec4 _mapColor;
vec2 _map_texCenter;
vec2 _map_texCoord;
vec2 vecFrame;
float zoomRate;
///////////////////////////////////////////////////////////
// Varyings
varying vec2 v_texCoord;


void main()
{
    // 背景テクスチャを書き込みrgbaそのまま
    _baseColor = texture2D(u_diffuseTexture, v_texCoord);
    gl_FragColor.rgba = _baseColor.rgba;
    
    // 透明度に応じてピクセルを棄却
    #if defined(TEXTURE_DISCARD_ALPHA)
    if (gl_FragColor.a < 0.05)
        discard;
    #endif

    // 加算合成
    if (v_texCoord.x < u_barRatio){
        gl_FragColor.rgb = u_barColor.rgb;
    }
}