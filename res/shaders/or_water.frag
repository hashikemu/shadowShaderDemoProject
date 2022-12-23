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

// ライティングの定義
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
uniform vec4 u_diffuseColor;
uniform sampler2D u_diffuseTexture;

#if defined(LIGHTMAP)
uniform sampler2D u_lightmapTexture;
#endif

#if defined(BUMPED)
uniform sampler2D u_normalmapTexture;
#endif

#if defined(LIGHTING)
    #if (DIRECTIONAL_LIGHT_COUNT > 0)
    uniform vec3 u_directionalLightColor[DIRECTIONAL_LIGHT_COUNT];
    uniform vec3 u_directionalLightDirection[DIRECTIONAL_LIGHT_COUNT];
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

#if defined(CUBEMAP)
uniform vec3        u_cameraPosition;
uniform samplerCube u_cubemapTexture;
#endif


///////////////////////////////////////////////////////////
// Variables
vec4 _baseColor;

///////////////////////////////////////////////////////////
// Varyings
varying vec3 v_position;
varying vec3 v_normal;
varying vec3 v_normalVector;
varying vec2 v_texCoord;
varying vec3 v_cameraDirection; 

#if defined(LIGHTMAP)
varying vec2 v_texCoord1;
#endif

#if defined(LIGHTING)
    #if (DIRECTIONAL_LIGHT_COUNT > 0)
    varying vec3 v_directionalLightDirection[DIRECTIONAL_LIGHT_COUNT];
    #endif

    #if (POINT_LIGHT_COUNT > 0)
    varying vec3 v_vertexToPointLightDirection[POINT_LIGHT_COUNT];
    #endif

    #if (SPOT_LIGHT_COUNT > 0)
    varying vec3 v_vertexToSpotLightDirection[SPOT_LIGHT_COUNT];
    varying vec3 v_spotLightDirection[SPOT_LIGHT_COUNT];
    #endif

    #include "or_lighting.frag"
#endif


void main(){
    // テクスチャかディフューズカラーで色を付ける
    #if defined(TEXTURED)
        #if defined(MIRRORTEX)
        _baseColor = texture2D(u_diffuseTexture, vec2(1.0-v_texCoord.x,v_texCoord.y));
        #else
        _baseColor = texture2D(u_diffuseTexture, v_texCoord);
        #endif
    #else
        #if defined(VERTEX_COLOR)
        _baseColor.rgb = v_color;
        #else
        _baseColor = u_diffuseColor;
        #endif
    #endif
 
    // 透明度を設定
    gl_FragColor.a = _baseColor.a;
    #if defined(TEXTURE_DISCARD_ALPHA)
    if (gl_FragColor.a < 0.05)
        discard;
    #endif

    // ライティングを適用
    #if defined(LIGHTING)
    gl_FragColor.rgb = getLitPixel();
    #else
    gl_FragColor.rgb = _baseColor.rgb;
    #endif

    // ライトマップを適用
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


    #if defined(CUBEMAP)
    vec3 ref = reflect(v_position - u_cameraPosition, v_normal);
    vec4 refColor = 0.5*textureCube(u_cubemapTexture, ref);
    // gl_FragColor += refColor;
    gl_FragColor.rgb = gl_FragColor.rgb + refColor.rgb - gl_FragColor.rgb*refColor.rgb;
    // gl_FragColor=refColor;
    #endif
}
