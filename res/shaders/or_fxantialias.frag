// FXAA shader written by hashikemu/karuua
// based on : 
// https://github.com/mattdesl/glsl-fxaa/blob/master/fxaa.glsl

#ifdef OPENGL_ES
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
#else
precision mediump float;
#endif


#ifndef FXAA_REDUCE_MIN
    #define FXAA_REDUCE_MIN   (1.0/ 128.0)
#endif
#ifndef FXAA_REDUCE_MUL
    #define FXAA_REDUCE_MUL   (1.0 / 8.0)
#endif
#ifndef FXAA_SPAN_MAX
    #define FXAA_SPAN_MAX     8.0
#endif


///////////////////////////////////////////////////////////
// Uniforms
uniform sampler2D u_texture;
uniform vec3 u_resolution;

///////////////////////////////////////////////////////////
// Varyings
varying vec2 v_texCoord;
varying vec4 v_color;



void main(){
    // 変数定義
    vec4 color;
    
	//compute the texture coords
	vec2 pixelUnit = 1.0 / u_resolution.xy;
    vec2 v_rgbNW = v_texCoord + vec2(-1.0, -1.0) * pixelUnit;
	vec2 v_rgbNE = v_texCoord + vec2(1.0, -1.0) * pixelUnit;
	vec2 v_rgbSW = v_texCoord + vec2(-1.0, 1.0) * pixelUnit;
	vec2 v_rgbSE = v_texCoord + vec2(1.0, 1.0) * pixelUnit;
	vec2 v_rgbM  = v_texCoord;

    // 4隅の色を取得
    vec3 rgbNW = texture2D(u_texture, v_rgbNW).rgb;
    vec3 rgbNE = texture2D(u_texture, v_rgbNE).rgb;
    vec3 rgbSW = texture2D(u_texture, v_rgbSW).rgb;
    vec3 rgbSE = texture2D(u_texture, v_rgbSE).rgb;
    vec4 texColor = texture2D(u_texture, v_rgbM);
    vec3 rgbM  = texColor.rgb;
    // 輝度の算出
    vec3 luma = vec3(0.299, 0.587, 0.114);
    float lumaNW = dot(rgbNW, luma);
    float lumaNE = dot(rgbNE, luma);
    float lumaSW = dot(rgbSW, luma);
    float lumaSE = dot(rgbSE, luma);
    float lumaM  = dot(rgbM,  luma);
    // 最大輝度，最小輝度の算出
    float lumaMin = min(lumaM, min(min(lumaNW, lumaNE), min(lumaSW, lumaSE)));
    float lumaMax = max(lumaM, max(max(lumaNW, lumaNE), max(lumaSW, lumaSE)));
    
    vec2 dir;
    dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
    dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));
    
    float dirReduce = max((lumaNW + lumaNE + lumaSW + lumaSE) *
                          (0.25 * FXAA_REDUCE_MUL), FXAA_REDUCE_MIN);
    
    float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
    dir = min(vec2(FXAA_SPAN_MAX, FXAA_SPAN_MAX),
              max(vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX),
              dir * rcpDirMin)) * pixelUnit;
    
    vec3 rgbA = 0.5 * (
        texture2D(u_texture, v_texCoord + dir * (1.0 / 3.0 - 0.5)).rgb +
        texture2D(u_texture, v_texCoord + dir * (2.0 / 3.0 - 0.5)).rgb);
    vec3 rgbB = rgbA * 0.5 + 0.25 * (
        texture2D(u_texture, v_texCoord + dir * -0.5).rgb +
        texture2D(u_texture, v_texCoord + dir * 0.5).rgb);

    // 輝度から取り出す色を切り替え
    float lumaB = dot(rgbB, luma);
    if ((lumaB < lumaMin) || (lumaB > lumaMax))
        color = vec4(rgbA, texColor.a);
    else
        color = vec4(rgbB, texColor.a);

    // 最終的な色をgl_FragColorに出力
    gl_FragColor = color;
}