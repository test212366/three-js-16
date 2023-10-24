uniform float time;
varying vec2 vUv;
varying vec3 vPosition;
uniform vec2 pixels;
uniform vec3 uMin;
float PI = 3.1415926;


vec2 rotate(vec2 v, float a) {
	float s = sin(a);
	float c = cos(a);
	mat2 m = mat2(c, -s, s, c);
	return m * v;
}


void main () {
	vUv = uv;
	vec3 newposition = position;
	newposition.z += 0.5*sin(PI * uv.x);
	vec2 dumb = vec2(0., 1.);
	 vec2 finalposition = rotate(dumb, uv.x * 2. * PI);


	 newposition = vec3(finalposition.x, newposition.y, finalposition.y);

	//newposition.xy = rotate(newposition.xy, time);
	gl_Position = projectionMatrix * modelViewMatrix * vec4(newposition, 1.0);
 

}