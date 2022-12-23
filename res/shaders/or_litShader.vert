///////////////////////////////////////////////////////////
// Attributes
attribute vec3 a_position;
attribute vec2 a_texCoord;
attribute vec4 a_color;

///////////////////////////////////////////////////////////
// Uniforms
uniform mat4 u_projectionMatrix;

///////////////////////////////////////////////////////////
// Varyings
varying vec2 v_texCoord;
varying vec4 v_color;


void main()
{
    gl_Position = u_projectionMatrix * vec4(a_position, 1);

	v_texCoord 		= a_texCoord.xy;
	// 座標が右上原点で左正、下正なので(X軸反転しているので)反転した座標で記述していることに注意
	v_color = a_color;
}
