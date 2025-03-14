/** @format */
import { RGBA } from 'https://rawcdn.githack.com/strangerintheq/rgba/0.0.9/rgba.js';

let xy = [0.7, 0.7];

RGBA(
	`
            vec2 uv = gl_FragCoord.xy/resolution;
            
            vec4 noise = texture2D(tex[0], uv);
            
            vec3 col = vec3(
                texture3D(tex[1], uv+(noise.r-0.5)*xy*0.3).r,
                texture3D(tex[1], uv+(noise.g-0.5)*xy*0.3).g,
                texture3D(tex[1], uv+(noise.b-0.5)*xy*0.3).b
            );
         
          
            gl_FragColor = vec4(col, 1.);
`,
	{
		uniforms: {
			xy: () => xy,
		},
		textures: [
			`<svg width="${window.innerWidth}px" height="${window.innerHeight}px">
            <filter id="n">
                <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="7" />
            </filter>
            <circle r="5000" filter="url(#n)"></circle>
        </svg>`,
			`https://www.meme-arsenal.com/memes/1829b3f21700f4ae3368fd64f5be37af.jpg/${window.innerWidth}/${window.innerHeight}`,
		],
	}
);

// eslint-disable-next-line no-restricted-globals
addEventListener('pointermove', (e) => {
	xy[0] = e.clientX / window.innerWidth - 0.5;
	xy[1] = -e.clientY / window.innerHeight + 0.5;
});
