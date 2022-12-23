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
uniform sampler2D   u_mapTexture;       // マップ画像テクスチャ(アスペクト比1:1を仮定)
uniform vec4        u_mapScaleParams;   // マップ画像のオフセットとスケーリング係数(画像中心がhgimg4でのxy位置[m]でどこか，画像縦横がhgimg4でどの程度のxy長さ[m]に相当するか)
uniform vec4        u_egoPose;          // 自分のポーズと表示範囲(x,y,thと表示範囲[m])
// uniform vec4        u_modulateColor;

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

    // マップ画像のuv生成
    // マップ中心のUV
    _map_texCenter = (u_egoPose.xy-u_mapScaleParams.xy)/u_mapScaleParams.zw + vec2(0.5,0.5);
    // 描画するプレートの相当UVを左下を(-1,-1)，右上を(1,1)として生成
    vecFrame = 2.0*vec2(v_texCoord.xy - vec2(0.5,0.5));
    // ズーム倍率を計算
    zoomRate = u_egoPose.w/u_mapScaleParams.z;
    // マップ画像から切り出すUV位置を計算(回転行列による座標変換+平行移動)　+M_PIした変換になってることに注意
    _map_texCoord.x=_map_texCenter.x + zoomRate*(vecFrame.x*cos(u_egoPose.z+PI) - vecFrame.y*sin(u_egoPose.z+PI));
    _map_texCoord.y=_map_texCenter.y + zoomRate*(vecFrame.x*sin(u_egoPose.z+PI) + vecFrame.y*cos(u_egoPose.z+PI));
    // 範囲でクランプ(UVがリピートするのを防止)
    _map_texCoord = clamp(_map_texCoord,0.0,1.0);
    // 生成したUVを用いてマップカラーを取得
    _mapColor = texture2D(u_mapTexture, _map_texCoord);
    
    // センターからαをtanhで減衰したαを生成

    // 加算合成
    gl_FragColor.rgb += _mapColor.rgb;

    // gl_FragColor.rgb = gl_FragColor.rgb + refColor.rgb - gl_FragColor.rgb*refColor.rgb;
}