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

///////////////////////////////////////////////////////////
// Varyings
varying vec2 v_texCoord;
varying vec4 v_color;


#include "or_common.inc"


void main(){
	// 変数定義
	vec2 texMin				= vec2( 0.0001, 0.0001 );
	vec2 l_texCoordCamScrC	= max( texMin, ( v_texCoord.xy * 0.5 ) + vec2( 0.0, 0.5 ) );
	vec2 l_texCoordCamSdwG	= max( texMin, ( v_texCoord.xy * 0.5 ) + vec2( 0.5, 0.0 ) );
	vec2 l_texCoordCamScrG	= max( texMin, ( v_texCoord.xy * 0.5 ) + vec2( 0.0, 0.0 ) );

	vec4 colorBase = texture2D(u_texture, l_texCoordCamScrC);
	vec4 colorSdwG = texture2D(u_texture, l_texCoordCamSdwG);
	vec4 colorScrG = texture2D(u_texture, l_texCoordCamScrG);

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
	scrDepthPosLightView *= u_lightViewMatrix;			// ライト視点ビュー行列　ワールド空間をライトビュー空間に変換
	scrDepthPosLightView *= u_scaleMatrix;				// ライトビュー空間をライトプロジェクション空間へ変換(平行投影カメラなのでズーム値の逆数をかけるだけ)

	float isShadowIgnore=0.0;
	if ( abs(scrDepthPosLightView.x)>1.0 | abs(scrDepthPosLightView.y)>1.0 ){
		isShadowIgnore=1.0;
	}
	scrDepthPosLightView.xy = clamp(scrDepthPosLightView.xy, -0.999,0.999);	// UV範囲の制限

	// ライトビュー空間のライト深度を取得(変換後座標のx,yを使用)
	vec2 l_texCoordLitSdwG	= (scrDepthPosLightView.xy*vec2(0.5,0.5)+vec2(0.5,0.5))*0.5 + vec2(0.5,0.5); // ビュー空間->UV空間->右上UV空間の2段階マッピング
	vec4 colorSdwGLit = texture2D(u_texture, l_texCoordLitSdwG);
	float sdwDepthLit = sdwNld2depth(decompress24(colorSdwGLit.xyz));

	// カメラビュー空間のライト深度と比較して不一致量がバイアス以上だったら影とみなす
	if (isShadowIgnore<0.5){
		if ((sdwDepthCam - sdwDepthLit) < -0.1){
			gl_FragColor *= 0.5;
		}
	}

	// gl_FragColor = 0.5*colorBase + 0.5*colorSdwGLit;
	// gl_FragColor = colorSdwGLit;
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