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
// Atributes
// gameplay3dから決め打ちで渡される値
attribute vec4 a_position;
attribute vec3 a_normal;
attribute vec3 a_tangent;
attribute vec3 a_binormal;
attribute vec2 a_texCoord;

#if defined(SKINNING)
attribute vec4 a_blendWeights;
attribute vec4 a_blendIndices;
#endif

#if defined(LIGHTMAP)
attribute vec2 a_texCoord1; 
#endif


///////////////////////////////////////////////////////////
// Uniforms
// マテリアル設定で渡す値　一部は自動でバインドされる？
uniform mat4 u_worldMatrix;
uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;
uniform mat4 u_worldViewMatrix;
uniform mat4 u_viewProjectionMatrix;
uniform mat4 u_worldViewProjectionMatrix;
uniform mat4 u_inverseTransposeWorldMatrix;
uniform mat4 u_inverseTransposeWorldViewMatrix;
uniform mat4 u_inverseTransposeProjectionMatrix;
uniform vec3 u_cameraPosition;
uniform vec3 u_cameraViewPosition;
uniform vec3 u_ambientColor;

// uniform mat4 u_worldMatrix;
// uniform mat4 u_worldViewProjectionMatrix;
// uniform mat4 u_inverseTransposeWorldViewMatrix;
// uniform vec3 u_cameraPosition;



#if defined(LIGHTING)
	#if (DIRECTIONAL_LIGHT_COUNT > 0)
	uniform vec3 u_directionalLightDirection[DIRECTIONAL_LIGHT_COUNT];
	#endif

	#if (POINT_LIGHT_COUNT > 0)
	uniform vec3 u_pointLightPosition[POINT_LIGHT_COUNT];
	#endif

	#if (SPOT_LIGHT_COUNT > 0) 
	uniform vec3 u_spotLightPosition[SPOT_LIGHT_COUNT];
	uniform vec3 u_spotLightDirection[SPOT_LIGHT_COUNT];
	#endif
#endif

#if defined(SKINNING)
uniform vec4 u_matrixPalette[SKINNING_JOINT_COUNT * 3];
#endif

#if defined(TEXTURE_REPEAT)
uniform vec2 u_textureRepeat;
#endif

#if defined(TEXTURE_OFFSET)
uniform vec2 u_textureOffset;
#endif

///////////////////////////////////////////////////////////
// Varyings
varying vec3 v_position;
varying vec3 v_normal;
varying vec2 v_texCoord;
varying vec3 v_normalVector;
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

	#include "or_lighting.vert"
#endif

#if defined(SKINNING)
#include "skinning.vert"
#else
#include "skinning-none.vert" 
#endif

#if defined(CLIP_PLANE)
varying float v_clipDistance;
#endif



#include "or_common.inc"



void main(){
	v_position = (u_worldMatrix * a_position).xyz;
	v_normal = (u_worldMatrix * vec4(a_normal, 0.0)).xyz;

	vec4 position = getPosition();
	gl_Position = u_worldViewProjectionMatrix * position;

	// ライティングの適用
	#if defined(LIGHTING)
		vec3 normal = getNormal();
		// Transform the normal, tangent and binormals to view space.
		mat3 inverseTransposeWorldViewMatrix = mat3(u_inverseTransposeWorldViewMatrix[0].xyz, u_inverseTransposeWorldViewMatrix[1].xyz, u_inverseTransposeWorldViewMatrix[2].xyz);
		vec3 normalVector = normalize(inverseTransposeWorldViewMatrix * normal);
		
		#if defined(BUMPED)
			vec3 tangent = getTangent();
			vec3 binormal = getBinormal();
			vec3 tangentVector  = normalize(inverseTransposeWorldViewMatrix * tangent);
			vec3 binormalVector = normalize(inverseTransposeWorldViewMatrix * binormal);
			mat3 tangentSpaceTransformMatrix = mat3(tangentVector.x, binormalVector.x, normalVector.x, tangentVector.y, binormalVector.y, normalVector.y, tangentVector.z, binormalVector.z, normalVector.z);
			applyLight(position, tangentSpaceTransformMatrix);
		#else
			v_normalVector = normalVector;
			applyLight(position);
		#endif
	#endif 
	
	// UV0の座標の計算と変更
	v_texCoord = a_texCoord;
	
	#if defined(TEXTURE_REPEAT)
	v_texCoord *= u_textureRepeat;
	#endif
	
	#if defined(TEXTURE_OFFSET)
	v_texCoord += u_textureOffset;
	#endif
	
	// ライトマップがある場合にはUV1に書き込み
	#if defined(LIGHTMAP)
	v_texCoord1 = a_texCoord1;
	#endif

	// 画面深度バッファ生成　カメラプロジェクションスペース
	v_scrGeom = u_worldViewProjectionMatrix * position;
	
	// ディレクショナルライトのシャドウバッファ(深度バッファ)生成とその他
	#if (DIRECTIONAL_LIGHT_COUNT > 0)

		// ワールド空間ライト方向を求めるための変換行列を計算、ワールド空間ライト方向を計算
		mat4 litDirMatrix = (u_worldMatrix * transpose(u_inverseTransposeWorldViewMatrix));
		litDirMatrix[3][0] = 0.0;
		litDirMatrix[3][1] = 0.0;
		litDirMatrix[3][2] = 0.0;
		litDirMatrix[3][3] = 1.0;
		vec4 litDirVec = -litDirMatrix * vec4(u_directionalLightDirection[0].xyz,1.0);
		v_worldLitDir = litDirVec.xyz;

		vec3 litZaxis = litDirVec.xyz;//vec3(0,0.2,-1);
		vec3 litXaxis = normalize(cross(vec3(0.0,0.0,-1.0),litZaxis));
		vec3 litYaxis = normalize(cross(litZaxis,litXaxis));
		
		mat4 directionalLightViewMatrix;
		directionalLightViewMatrix[0][0] = litXaxis.x;
		directionalLightViewMatrix[0][1] = litYaxis.x;
		directionalLightViewMatrix[0][2] = litZaxis.x;
		directionalLightViewMatrix[1][0] = litXaxis.y;
		directionalLightViewMatrix[1][1] = litYaxis.y;
		directionalLightViewMatrix[1][2] = litZaxis.y;
		directionalLightViewMatrix[2][0] = litXaxis.z;
		directionalLightViewMatrix[2][1] = litYaxis.z;
		directionalLightViewMatrix[2][2] = litZaxis.z;
		directionalLightViewMatrix[3][0] = -u_cameraPosition.x;
		directionalLightViewMatrix[3][1] = -u_cameraPosition.z;
		directionalLightViewMatrix[3][2] = -u_cameraPosition.y;	// なんかyとzが逆っぽい
		directionalLightViewMatrix[3][3] = 1.0;

		// 画面深度バッファ計算　ライトビュースペース
		// v_sdwGeom = position;
		// v_sdwGeom = u_worldMatrix*v_sdwGeom;
		// v_sdwGeom = directionalLightViewMatrix*v_sdwGeom;
		v_sdwGeom = directionalLightViewMatrix*u_worldMatrix*position;
	#endif
}
