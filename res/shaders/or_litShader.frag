// shadow blend shader written by hashikemu/karuua

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
uniform mat4 u_inverseProjectionMatrix;
uniform mat4 u_inverseViewMatrix;
uniform mat4 u_lightViewMatrix;
uniform mat4 u_scaleMatrix;
uniform vec3 u_litToCameraVec;
uniform float u_shadowBias;

///////////////////////////////////////////////////////////
// Varyings
varying vec2 v_texCoord;
varying vec4 v_color;


#include "or_common.inc"


void main(){
	#define bufferDivideRatioX 0.25
	#define bufferDivideRatioY 0.333334
	// 変数定義
	vec2 texMin				= vec2( 0.0001, 0.0001 );
	vec2 l_texCoordCamScrC	= max( texMin, v_texCoord.xy*vec2( bufferDivideRatioX, bufferDivideRatioY ) + vec2( 0.0, bufferDivideRatioY*2.0 ) );
	vec2 l_texCoordCamScrG	= max( texMin, v_texCoord.xy*vec2( bufferDivideRatioX, bufferDivideRatioY ) + vec2( 0.0, bufferDivideRatioY*1.0 ) );
	vec2 l_texCoordCamSdwG	= max( texMin, v_texCoord.xy*vec2( bufferDivideRatioX, bufferDivideRatioY ) + vec2( 0.0, bufferDivideRatioY*0.0 ) );

	vec4 colorBase = texture2D(u_texture, l_texCoordCamScrC);
	vec4 colorScrG = texture2D(u_texture, l_texCoordCamScrG);
	vec4 colorSdwG = texture2D(u_texture, l_texCoordCamSdwG);

	// 最終的な色をgl_FragColorに出力
	gl_FragColor = colorBase;

	// 描画対象ピクセルのカメラビュー空間のライト深度を取得
	float sdwDepthCam = sdwNld2depth(decompress24(colorSdwG.xyz));

	// 描画対象ピクセルのカメラプロジェクション空間のカメラ深度を取得
	float wCamProj = litNld2depth(decompress16(colorScrG.xy));
	float zCamProj = (2*colorScrG.z-1);
	// wで割る前のプロジェクション座標(x*w, y*w, z*w, w)を復元する　https://light11.hatenadiary.com/entry/2018/06/10/233954
	vec4 scrDepthPosCameraProj = vec4((2*v_texCoord.xy-1)*wCamProj, zCamProj*wCamProj, wCamProj);

	// カメラプロジェクション座標からライトビュー座標を算出 各ピクセルのプロジェクション座標を座標変換
	vec4 scrDepthPosLightView;
	// scrDepthPosLightView /= wCamProj; // wで割ると画面UVに戻る
	scrDepthPosLightView = scrDepthPosCameraProj;		// ベースとなるプロジェクション空間座標を取り出し
	scrDepthPosLightView *= u_inverseProjectionMatrix;	// プロジェクション逆行列　プロジェクション空間をビュー空間に変換
	scrDepthPosLightView *= u_inverseViewMatrix;		// ビュー逆行列　ビュー空間をワールド空間に変換
	scrDepthPosLightView.xyz += u_litToCameraVec;
	scrDepthPosLightView *= u_lightViewMatrix;			// ライト視点ビュー行列　ワールド空間をライトビュー空間に変換
	scrDepthPosLightView *= u_scaleMatrix;				// ライトビュー空間をライトプロジェクション空間へ変換(平行投影カメラなのでズーム値の逆数をかけるだけ)

	// シャドウマップ範囲外か判定して無視フラグを変更
	float isShadowIgnore=0.0;
	if ( abs(scrDepthPosLightView.x)>1.0 ){
		isShadowIgnore=1.0;
	}
	if ( abs(scrDepthPosLightView.y)>1.0 ){
		isShadowIgnore=1.0;
	}
	scrDepthPosLightView.xy = clamp(scrDepthPosLightView.xy, -0.999,0.999);	// UV範囲の制限

	// ライトビュー空間のライト深度を取得(変換後座標のx,yを使用)
	// vec2 l_texCoordLitSdwG	= (scrDepthPosLightView.xy*vec2(0.5,0.5)+vec2(0.5,0.5))*vec2(0.75,0.75) + vec2(0.25,0.25); // ビュー空間->UV空間->右上UV空間の2段階マッピング
	// vec2 l_texCoordLitSdwG	= (scrDepthPosLightView.xy*vec2(0.5,0.5)+vec2(0.5,0.5))*vec2(1-bufferDivideRatioX,1-bufferDivideRatioY) + vec2(bufferDivideRatioX,bufferDivideRatioY); // ビュー空間->UV空間->右上UV空間の2段階マッピング
	vec2 l_texCoordLitSdwG	= (scrDepthPosLightView.xy*vec2(0.5,0.5)+vec2(0.5,0.5))*vec2(1-bufferDivideRatioX,1) + vec2(bufferDivideRatioX,0); // ビュー空間->UV空間->右上UV空間の2段階マッピング
	vec4 colorSdwGLit = texture2D(u_texture, l_texCoordLitSdwG);
	float sdwDepthLit = sdwNld2depth(decompress24(colorSdwGLit.xyz));


	// ソフトシャドウ化するため残り4点サンプリング
	float sdwDepthLit_R;
	float sdwDepthLit_L;
	float sdwDepthLit_U;
	float sdwDepthLit_D;
	#define EPSILON (0.00001)
	colorSdwGLit	= texture2D(u_texture, clamp(l_texCoordLitSdwG+vec2( SHADOW_SOFT_SAMPLING_PTB, SHADOW_SOFT_SAMPLING_PTB),0.0,1.0-EPSILON));
	sdwDepthLit_R	= sdwNld2depth(decompress24(colorSdwGLit.xyz));
	colorSdwGLit	= texture2D(u_texture, clamp(l_texCoordLitSdwG+vec2(-SHADOW_SOFT_SAMPLING_PTB,-SHADOW_SOFT_SAMPLING_PTB),0.0,1.0-EPSILON));
	sdwDepthLit_L	= sdwNld2depth(decompress24(colorSdwGLit.xyz));
	colorSdwGLit	= texture2D(u_texture, clamp(l_texCoordLitSdwG+vec2(-SHADOW_SOFT_SAMPLING_PTB, SHADOW_SOFT_SAMPLING_PTB),0.0,1.0-EPSILON));
	sdwDepthLit_U	= sdwNld2depth(decompress24(colorSdwGLit.xyz));
	colorSdwGLit	= texture2D(u_texture, clamp(l_texCoordLitSdwG+vec2( SHADOW_SOFT_SAMPLING_PTB,-SHADOW_SOFT_SAMPLING_PTB),0.0,1.0-EPSILON));
	sdwDepthLit_D	= sdwNld2depth(decompress24(colorSdwGLit.xyz));
	sdwDepthLit = 0.6*sdwDepthLit + 0.1*sdwDepthLit_R + 0.1*sdwDepthLit_L + 0.1*sdwDepthLit_U + 0.1*sdwDepthLit_D;

	// カメラ視点とライト視点で基準位置が異なるので補正
	sdwDepthLit -= u_litToCameraVec.z;

	// カメラビュー空間のライト深度と比較して不一致量がバイアス以上だったら影とみなす
	if (isShadowIgnore<0.5){
		if ((sdwDepthLit - sdwDepthCam) > u_shadowBias){
			// gl_FragColor *= 0.5;
			gl_FragColor *= (1.0 - 0.5*min(1,(1-pow(1-2.0*(sdwDepthLit - sdwDepthCam),3))) );
		}
		// gl_FragColor *= (1.0 - 0.5*sigmoid((sdwDepthLit - sdwDepthCam) - u_shadowBias ,5.0));
	}

	// gl_FragColor = 0.5*colorBase + 0.5*colorSdwGLit;
	// gl_FragColor = colorBase;
	// gl_FragColor = colorSdwGLit;
	// gl_FragColor = colorSdwG;
	// gl_FragColor = colorScrG;
	// gl_FragColor = texture2D(u_texture, v_texCoord);
	// gl_FragColor.rgb = scrDepthPosLightView.xyz;
	// gl_FragColor.rgb = vec3(sdwDepthLit - sdwDepthCam);
}

	// gl_FragColor.rgb = 0.01*scrDepthPosCameraView.z;
	// gl_FragColor.rgb = scrDepthPosCameraProj.xyz;
	// gl_FragColor.rgb = vec3(5.0*SHADOW_PROJ_WORLD_RANGE*scrDepthPosLightView.xy,0.0);
	// gl_FragColor = decompress24(colorScrG.xyz);
	// gl_FragColor = colorSdwG;
	// gl_FragColor = 0.1*sdwDepthCam;
	// gl_FragColor = wCamProj;
	// gl_FragColor = colorScrG.b;
	// gl_FragColor = scrDepthCam;
	// gl_FragColor = 0.5*scrDepthPosCameraView.xyz;
	// gl_FragColor = 0.1*(sdwDepthCam-scrDepthCam);
	// gl_FragColor = sdwDepthLit;
	// gl_FragColor.rgb = 0.5*colorBase + 0.5*scrDepthPosLightView.xyz;
	// gl_FragColor = u_cameraProjToOrthoLightViewMatrix[3][0];