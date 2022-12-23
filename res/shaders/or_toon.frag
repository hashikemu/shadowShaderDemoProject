#ifdef OPENGL_ES
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
#else
precision mediump float;
#endif

#ifndef DIRECTIONAL_LIGHT_COUNT
#define DIRECTIONAL_LIGHT_COUNT 0
#endif
#ifndef SPOT_LIGHT_COUNT
#define SPOT_LIGHT_COUNT 0
#endif
#ifndef POINT_LIGHT_COUNT
#define POINT_LIGHT_COUNT 0
#endif
#if (DIRECTIONAL_LIGHT_COUNT > 0) || (POINT_LIGHT_COUNT > 0) || (SPOT_LIGHT_COUNT > 0)
#define LIGHTING
#endif

///////////////////////////////////////////////////////////
// Uniforms
uniform vec3 u_ambientColor;

uniform sampler2D u_diffuseTexture;

#if defined(LIGHTMAP)
uniform sampler2D u_lightmapTexture;
#endif

#if defined(LIGHTING)

#if defined(BUMPED)
uniform sampler2D u_normalmapTexture;
#endif

#if (DIRECTIONAL_LIGHT_COUNT > 0)
uniform vec3 u_directionalLightColor[DIRECTIONAL_LIGHT_COUNT];
#if !defined(BUMPED)
uniform vec3 u_directionalLightDirection[DIRECTIONAL_LIGHT_COUNT];
#endif
#endif

#if (POINT_LIGHT_COUNT > 0)
uniform vec3 u_pointLightColor[POINT_LIGHT_COUNT];
uniform vec3 u_pointLightPosition[POINT_LIGHT_COUNT];
uniform float u_pointLightRangeInverse[POINT_LIGHT_COUNT];
#endif

#if (SPOT_LIGHT_COUNT > 0)
uniform vec3 u_spotLightColor[SPOT_LIGHT_COUNT];
uniform float u_spotLightRangeInverse[SPOT_LIGHT_COUNT];
uniform float u_spotLightInnerAngleCos[SPOT_LIGHT_COUNT];
uniform float u_spotLightOuterAngleCos[SPOT_LIGHT_COUNT];
#if !defined(BUMPED)
uniform vec3 u_spotLightDirection[SPOT_LIGHT_COUNT];
#endif
#endif

#if defined(SPECULAR)
uniform float u_specularExponent;
#endif

#endif

#if defined(MODULATE_COLOR)
uniform vec4 u_modulateColor;
#endif

#if defined(MODULATE_ALPHA)
uniform float u_modulateAlpha;
#endif

// パラメータ
uniform float u_Fval;
uniform float u_specularPower;

///////////////////////////////////////////////////////////
// Variables
vec4 _baseColor;
float _fresnel;
float _F0;
///////////////////////////////////////////////////////////
// Varyings
varying vec2 v_texCoord;

#if defined(LIGHTMAP)
varying vec2 v_texCoord1;
#endif

#if defined(LIGHTING)

#if !defined(BUMPED)
varying vec3 v_normalVector;
#endif

#if defined(BUMPED) && (DIRECTIONAL_LIGHT_COUNT > 0)
varying vec3 v_directionalLightDirection[DIRECTIONAL_LIGHT_COUNT];
#endif

#if (POINT_LIGHT_COUNT > 0)
varying vec3 v_vertexToPointLightDirection[POINT_LIGHT_COUNT];
#endif

#if (SPOT_LIGHT_COUNT > 0)
varying vec3 v_vertexToSpotLightDirection[SPOT_LIGHT_COUNT];
#if defined(BUMPED)
varying vec3 v_spotLightDirection[SPOT_LIGHT_COUNT];
#endif
#endif

#if defined(SPECULAR)
varying vec3 v_cameraDirection; 
#endif

#include "or_lighting.frag"

#endif

#if defined(CLIP_PLANE)
varying float v_clipDistance;
#endif

// モデル座標系での視線ベクトルを計算した結果
varying vec3 v_viewDir;

void main()
{
    #if defined(CLIP_PLANE)
    if(v_clipDistance < 0.0) discard;
    #endif
 
    #if defined(MIRRORTEX)
    _baseColor = texture2D(u_diffuseTexture, vec2(1.0-v_texCoord.x,v_texCoord.y));
    #else
    _baseColor = texture2D(u_diffuseTexture, v_texCoord);
    #endif
 
//  テストコードを書く場所はこのあたり
    // res/shaderにカスタムシェーダを配置すると動作する　たぶん別の場所でもOKのはず
    // _baseColor = 0.5と書くとrgb(aも？)すべてに0.5が入るが，ビルトイン関数を使用すると出力が拡張されないっぽい
    // _baseColor.r = length(_baseColor.rgb);
    // _baseColor.g = length(_baseColor.rgb);
    // _baseColor.b = length(_baseColor.rgb);
    // _baseColor.rgb = vec3 (length(_baseColor.rgb),length(_baseColor.rgb),length(_baseColor.rgb));//length(v_normalVector);//0.5 + (1.0 - 0.5) * pow(1.0 - dot(v_cameraDirection,v_normalVector),5);

    // _baseColor.rgb = vec3(v_normalVector.x,v_normalVector.y,v_normalVector.z);  //ノーマル
    // _baseColor.rgb = vec3(v_cameraDirection.x,v_cameraDirection.y,v_cameraDirection.z); //カメラのワールド座標

    _F0 = u_Fval;
    _fresnel = _F0 + (1.0-_F0) * pow(1.0 - dot(normalize(v_viewDir.xyz),normalize(v_normalVector.xyz)),5.0);
    _fresnel = _fresnel;
    _fresnel = clamp(_fresnel, 0.0, 1.0);
    _baseColor.rgb += vec3(_fresnel,_fresnel,_fresnel);
    _baseColor = clamp(_baseColor, 0.0, 1.0);
// _baseColor.rgb=vec3(0.5,0.5,0.5);
    // _baseColor.rgb = v_viewDir;
    





    gl_FragColor.a = _baseColor.a;

    #if defined(TEXTURE_DISCARD_ALPHA)
    if (gl_FragColor.a < 0.5)
        discard;
    #endif

    #if defined(LIGHTING)
    gl_FragColor.rgb =getLitPixel(); // vec3(0.0,0.0,0.0);// _baseColor.rgb;
    #else
    gl_FragColor.rgb = _baseColor.rgb;
    #endif

	#if defined(LIGHTMAP)
	vec4 lightColor = texture2D(u_lightmapTexture, v_texCoord1);
	gl_FragColor.rgb *= lightColor.rgb;
	#endif

    #if defined(MODULATE_COLOR)
    gl_FragColor *= u_modulateColor;
    #endif

    #if defined(MODULATE_ALPHA)
    gl_FragColor.a *= u_modulateAlpha;
    #endif
}
