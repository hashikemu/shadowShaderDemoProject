


#define LIT_DEPTH_NEAR				(0.5)
#define LIT_DEPTH_FAR				(200.0)
#define SHADOW_DEPTH_NEAR			(-100.0)
#define SHADOW_DEPTH_FAR			(100.0)
// #define LIT_DEPTH_NEAR				(0.5)
// #define LIT_DEPTH_FAR				(2000.0)
// #define SHADOW_DEPTH_NEAR			(-500.0)
// #define SHADOW_DEPTH_FAR			(500.0)
#define LIT_DEPTH_RANGE				(LIT_DEPTH_FAR - LIT_DEPTH_NEAR)
#define SHADOW_DEPTH_RANGE			(SHADOW_DEPTH_FAR - SHADOW_DEPTH_NEAR)

#define SHADOW_SOFT_SAMPLING_PTB	(0.0005)

float sdwDepth2nld( in float depth )
{
	return ( depth -SHADOW_DEPTH_NEAR ) /SHADOW_DEPTH_RANGE;
}

float sdwNld2depth( in float nld )
{
	return nld *SHADOW_DEPTH_RANGE + SHADOW_DEPTH_NEAR;
}

float litDepth2nld( in float depth )
{
	return ( depth -LIT_DEPTH_NEAR ) /LIT_DEPTH_RANGE;
}

float litNld2depth( in float nld )
{
	return nld *LIT_DEPTH_RANGE + LIT_DEPTH_NEAR;
}

float sigmoid( float value, float gain ){
	return 1.0 / ( 1.0 + exp(-gain * value ) );
}


//------------------------------------------------
// compression
#define CHANNEL_RANGE_MAX			(255.0)
#define CHANNEL_RANGE_SUPERIOR		(256.0)


vec2 compress16( in float value )
{
	vec2 comp = fract( vec2( 1.0, CHANNEL_RANGE_MAX ) *value );
	comp -= comp.yy * vec2( 1.0 /CHANNEL_RANGE_MAX, 0.0 );
	return comp;
}

float decompress16( in vec2 value )
{
	float decomp = dot( value, vec2( 1.0, 1.0 /CHANNEL_RANGE_MAX ) );
	return decomp;
}

vec3 compress24( in float value )
{
	vec3 comp = fract( vec3( 1.0, CHANNEL_RANGE_MAX, CHANNEL_RANGE_MAX*CHANNEL_RANGE_MAX ) *value );
	comp -= comp.yzz * vec3( 1.0 /CHANNEL_RANGE_MAX, 1.0 /CHANNEL_RANGE_MAX, 0.0 );
	return comp;
}

float decompress24( in vec3 value )
{
	float decomp = dot( value, vec3( 1.0, 1.0 /CHANNEL_RANGE_MAX, 1.0 /CHANNEL_RANGE_MAX /CHANNEL_RANGE_MAX ) );
	return decomp;
}