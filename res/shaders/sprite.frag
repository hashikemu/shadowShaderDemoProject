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

///////////////////////////////////////////////////////////
// Uniforms
uniform sampler2D u_texture;

///////////////////////////////////////////////////////////
// Varyings
varying vec2 v_texCoord;
varying vec4 v_color;


void main()
{
    // gl_FragColor.a = _baseColor.a;

    // #if defined(TEXTURE_DISCARD_ALPHA)
    // if (gl_FragColor.a < 0.5)
    //     discard;
    // #endif

    gl_FragColor = v_color * texture2D(u_texture, v_texCoord);
}