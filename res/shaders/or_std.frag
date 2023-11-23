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


uniform mat4 u_inverseTransposeWorldViewMatrix;
uniform mat4 u_worldMatrix;

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
varying vec4 v_scrGeom;
varying vec4 v_sdwGeom;
varying vec3 v_worldLitDir;

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


#include "or_common.inc"



void main(){
	#if (DIRECTIONAL_LIGHT_COUNT > 0)

	// シャドウマップ(ライトシャドウジオメトリ)
	if (u_directionalLightColor[0].r == 0.0){
		// NO_RECV_SHADOW
		// NO_CAST_SHADOW
		#if defined(NO_CAST_SHADOW)
			gl_FragColor.rgba = vec4(compress24(sdwDepth2nld(v_sdwGeom.z-50.0)), 1.0);
			return;
			// discard;
		#else
			// Z成分のみをNLDに変換してから24bitにエンコード(アルファチャンネルは1以外だと後ろのオブジェクトの色が透けて見えてしまうため1固定)
			gl_FragColor.rgba = vec4(compress24(sdwDepth2nld(v_sdwGeom.z)), 1.0);
			return;
		#endif
	}

	// デプスマップ(スクリーンジオメトリ)
	if (u_directionalLightColor[0].g == 0.0){
		// -1~1->0~1
		// gl_FragColor.rgba = vec4((v_scrGeom.xyz/v_scrGeom.w +1.0)/2.0, 1.0);
		gl_FragColor.rgba = vec4(compress16(litDepth2nld(v_scrGeom.w)), (v_scrGeom.z/v_scrGeom.w +1.0)/2.0, 1.0);
		return;
	}

	// シャドウマップ(カメラシャドウジオメトリ)
	if (u_directionalLightColor[0].b == 0.0){
		#if defined(NO_RECV_SHADOW)
			#if defined(NO_DEPTH)
			discard;
			#else
			gl_FragColor.rgba = vec4(compress24(sdwDepth2nld(v_sdwGeom.z+50.0)), 1.0);
			return;
			#endif
			// discard;
		#else
			// Z成分のみをNLDに変換してから24bitにエンコード(アルファチャンネルは1以外だと後ろのオブジェクトの色が透けて見えてしまうため1固定)
			gl_FragColor.rgba = vec4(compress24(sdwDepth2nld(v_sdwGeom.z)), 1.0);
			return;
		#endif
	}

	#endif


	// テクスチャかディフューズカラーで色を付ける
	#if defined(TEXTURED)
		#if defined(MIRRORTEX)
		_baseColor = texture2D(u_diffuseTexture, vec2(1.0-v_texCoord.x,v_texCoord.y));
		#else
		_baseColor = texture2D(u_diffuseTexture, v_texCoord);
		#endif

		// #if defined(SKYBOX)
		// _baseColor = textureCube(u_diffuseTexture, v_texCoord);
		// #endif
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


	// #if (DIRECTIONAL_LIGHT_COUNT > 0)

	// ワールド空間ライト方向を用いたシェーディング
	// float diffuse = max(dot(normalize(v_normal), v_worldLitDir), 0.5);
	// gl_FragColor.rgb *=diffuse;

	// getLitPixelで使用されるv_directionalLightDirectionと、自前計算しているワールド空間でのライト方向を減算して一致(黒画面)になることを確認した
	// 結果から、u_directionalLightDirectionはView空間での情報で、v_directionalLightDirectionはワールド空間に変換済みの結果っぽい
	// gl_FragColor.rgb = v_directionalLightDirection[0].xyz - v_worldLitDir.xyz;

	// #endif


}
