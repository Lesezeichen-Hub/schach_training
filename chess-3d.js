(function (root) {
  "use strict";

  // Dimensions are in square widths, like a weighted, turned Staunton set.
  function turnedBase(radius) {
    return [[0,0],[0,radius*.88],[.018,radius*.97],[.04,radius],[.065,radius],
      [.082,radius*.98],[.095,radius*.92],[.107,radius*.91],[.119,radius*.98],
      [.14,radius*.99],[.16,radius*.95],[.185,radius*.86],[.215,radius*.77],
      [.25,radius*.68],[.28,radius*.6]];
  }
  const collar = (y,r) => [[y,r*.88],[y+.018,r],[y+.044,r],[y+.065,r*.88]];
  const profiles = {
    p: [...turnedBase(.34),[.34,.17],[.43,.13],[.55,.105],[.66,.10],[.72,.12],...collar(.74,.165),[.83,.11],[.85,0]],
    r: [...turnedBase(.4),[.34,.215],[.42,.195],[.57,.18],[.78,.175],[1.02,.19],[1.10,.22],...collar(1.12,.29),[1.22,.275],[1.3,.285],[1.3,.215],[1.24,.215],[1.235,0]],
    n: [...turnedBase(.39),[.33,.215],...collar(.35,.245),[.44,.205],[.47,0]],
    b: [...turnedBase(.37),[.36,.19],[.47,.15],[.63,.115],[.85,.095],[1.04,.115],[1.13,.16],...collar(1.15,.245),[1.225,.19],...collar(1.25,.225),[1.33,.12],[1.38,0]],
    q: [...turnedBase(.415),[.36,.21],[.48,.165],[.67,.12],[.91,.10],[1.15,.115],[1.30,.16],...collar(1.33,.25),[1.415,.19],...collar(1.44,.26),[1.52,.19],[1.58,.17],[1.62,0]],
    k: [...turnedBase(.43),[.37,.215],[.5,.17],[.71,.125],[.98,.105],[1.22,.12],[1.39,.165],...collar(1.42,.26),[1.5,.2],...collar(1.53,.275),[1.61,.21],[1.67,.19],[1.73,.225],[1.77,.225],[1.8,.18],[1.81,0]]
  };
  const coordinateGlyphs = {
    a:["000","011","101","111","101"], b:["100","100","110","101","110"],
    c:["000","011","100","100","011"], d:["001","001","011","101","011"],
    e:["000","010","101","110","011"], f:["011","010","111","010","010"],
    g:["000","011","101","011","001"], h:["100","100","110","101","101"],
    1:["010","110","010","010","111"], 2:["110","001","010","100","111"],
    3:["110","001","010","001","110"], 4:["101","101","111","001","001"],
    5:["111","100","110","001","110"], 6:["011","100","110","101","010"],
    7:["111","001","010","010","010"], 8:["111","101","111","101","111"]
  };

  function multiply(a, b) {
    const out = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + r] * b[c * 4 + k];
      out[c * 4 + r] = sum;
    }
    return out;
  }
  function perspective(fov, aspect, near, far) {
    const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far);
    return new Float32Array([f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0]);
  }
  function normalize(v) { const l = Math.hypot(...v) || 1; return v.map((n) => n/l); }
  function cross(a,b) { return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
  function lookAt(eye, center, up) {
    const z = normalize(eye.map((n,i)=>n-center[i])), x = normalize(cross(up,z)), y = cross(z,x);
    return new Float32Array([x[0],y[0],z[0],0, x[1],y[1],z[1],0, x[2],y[2],z[2],0,
      -(x[0]*eye[0]+x[1]*eye[1]+x[2]*eye[2]), -(y[0]*eye[0]+y[1]*eye[1]+y[2]*eye[2]), -(z[0]*eye[0]+z[1]*eye[1]+z[2]*eye[2]), 1]);
  }
  function model(x,y,z,sx,sy,sz) { return new Float32Array([sx,0,0,0, 0,sy,0,0, 0,0,sz,0, x,y,z,1]); }
  function modelRotX(x,y,z,sx,sy,sz,a) { const c=Math.cos(a),s=Math.sin(a);return new Float32Array([sx,0,0,0, 0,c*sy,s*sy,0, 0,-s*sz,c*sz,0, x,y,z,1]); }
  function modelRotY(x,y,z,sx,sy,sz,a) { const c=Math.cos(a),s=Math.sin(a);return new Float32Array([c*sx,0,-s*sx,0, 0,sy,0,0, s*sz,0,c*sz,0, x,y,z,1]); }
  function inverse(m) {
    const o=new Float32Array(16), a=m;
    const b00=a[0]*a[5]-a[1]*a[4], b01=a[0]*a[6]-a[2]*a[4], b02=a[0]*a[7]-a[3]*a[4], b03=a[1]*a[6]-a[2]*a[5], b04=a[1]*a[7]-a[3]*a[5], b05=a[2]*a[7]-a[3]*a[6], b06=a[8]*a[13]-a[9]*a[12], b07=a[8]*a[14]-a[10]*a[12], b08=a[8]*a[15]-a[11]*a[12], b09=a[9]*a[14]-a[10]*a[13], b10=a[9]*a[15]-a[11]*a[13], b11=a[10]*a[15]-a[11]*a[14];
    let d=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06; if(!d)return null; d=1/d;
    o[0]=(a[5]*b11-a[6]*b10+a[7]*b09)*d;o[1]=(-a[1]*b11+a[2]*b10-a[3]*b09)*d;o[2]=(a[13]*b05-a[14]*b04+a[15]*b03)*d;o[3]=(-a[9]*b05+a[10]*b04-a[11]*b03)*d;
    o[4]=(-a[4]*b11+a[6]*b08-a[7]*b07)*d;o[5]=(a[0]*b11-a[2]*b08+a[3]*b07)*d;o[6]=(-a[12]*b05+a[14]*b02-a[15]*b01)*d;o[7]=(a[8]*b05-a[10]*b02+a[11]*b01)*d;
    o[8]=(a[4]*b10-a[5]*b08+a[7]*b06)*d;o[9]=(-a[0]*b10+a[1]*b08-a[3]*b06)*d;o[10]=(a[12]*b04-a[13]*b02+a[15]*b00)*d;o[11]=(-a[8]*b04+a[9]*b02-a[11]*b00)*d;
    o[12]=(-a[4]*b09+a[5]*b07-a[6]*b06)*d;o[13]=(a[0]*b09-a[1]*b07+a[2]*b06)*d;o[14]=(-a[12]*b03+a[13]*b01-a[14]*b00)*d;o[15]=(a[8]*b03-a[9]*b01+a[10]*b00)*d; return o;
  }
  function transform(m,v) { const o=[0,0,0,0]; for(let r=0;r<4;r++)o[r]=m[r]*v[0]+m[4+r]*v[1]+m[8+r]*v[2]+m[12+r]*v[3]; return o; }

  function lathe(profile, segments=96) {
    const vertices=[], indices=[];
    for(let i=0;i<profile.length;i++) {
      const [y,rad]=profile[i], prev=profile[Math.max(0,i-1)], next=profile[Math.min(profile.length-1,i+1)];
      const slope=(next[1]-prev[1])/(next[0]-prev[0]||1);
      for(let s=0;s<=segments;s++) { const a=s/segments*Math.PI*2, ca=Math.cos(a), sa=Math.sin(a), n=normalize([ca,-slope,sa]); vertices.push(rad*ca,y,rad*sa,n[0],n[1],n[2]); }
    }
    for(let i=0;i<profile.length-1;i++) for(let s=0;s<segments;s++) { const a=i*(segments+1)+s,b=a+segments+1; indices.push(a,b,a+1,a+1,b,b+1); }
    return {vertices,indices};
  }
  function faceMesh(polygons) {
    const vertices=[],indices=[];
    for(const polygon of polygons){
      const normal=normalize(cross(polygon[2].map((v,i)=>v-polygon[0][i]),polygon[1].map((v,i)=>v-polygon[0][i]))),base=vertices.length/6;
      for(const p of polygon)vertices.push(...p,...normal);
      for(let i=1;i<polygon.length-1;i++)indices.push(base,base+i,base+i+1);
    }
    return {vertices,indices};
  }
  function battlement() {
    const polygons=[],steps=12,start=-Math.PI/9,end=Math.PI/9;
    const point=(angle,r,y)=>[Math.sin(angle)*r,y,Math.cos(angle)*r];
    for(let i=0;i<steps;i++){
      const a=start+(end-start)*i/steps,b=start+(end-start)*(i+1)/steps;
      polygons.push([point(a,.285,1.29),point(a,.285,1.46),point(b,.285,1.46),point(b,.285,1.29)],
        [point(a,.215,1.29),point(b,.215,1.29),point(b,.215,1.46),point(a,.215,1.46)],
        [point(a,.215,1.46),point(b,.215,1.46),point(b,.285,1.46),point(a,.285,1.46)]);
    }
    for(const a of [start,end]){
      const cap=[point(a,.215,1.29),point(a,.215,1.46),point(a,.285,1.46),point(a,.285,1.29)];
      polygons.push(a===start?cap:cap.reverse());
    }
    return faceMesh(polygons);
  }
  function crown() {
    const polygons=[],steps=160;
    const point=(i,r,y)=>{const a=i/steps*Math.PI*2;return [Math.sin(a)*r,y,Math.cos(a)*r];};
    const top=i=>1.77+.16*Math.pow((1+Math.cos(i/steps*Math.PI*20))/2,3);
    for(let i=0;i<steps;i++)polygons.push(
      [point(i,.18,1.55),point(i,.295,top(i)),point(i+1,.295,top(i+1)),point(i+1,.18,1.55)],
      [point(i,.245,top(i)),point(i,.13,1.57),point(i+1,.13,1.57),point(i+1,.245,top(i+1))],
      [point(i,.245,top(i)),point(i+1,.245,top(i+1)),point(i+1,.295,top(i+1)),point(i,.295,top(i))]);
    return faceMesh(polygons);
  }
  function bishopMitre() {
    const source=lathe([[1.32,0],[1.34,.10],[1.39,.17],[1.47,.205],[1.55,.195],[1.64,.15],[1.72,.09],[1.77,.035],[1.78,0]]),vertices=[],indices=[];
    // Clip both halves and close the cut faces: this is a real diagonal slot.
    for(const side of [-1,1]){
      const intersections=[],distance=v=>side*(v[2]-.62*(v[1]-1.58))-.025;
      for(let i=0;i<source.indices.length;i+=3){
        const triangle=source.indices.slice(i,i+3).map(index=>source.vertices.slice(index*6,index*6+6)),polygon=[];
        for(let j=0;j<3;j++){
          const a=triangle[j],b=triangle[(j+1)%3],da=distance(a),db=distance(b);
          if(da>=0)polygon.push(a);
          if((da>=0)!==(db>=0)){const t=da/(da-db),p=a.map((v,k)=>v+(b[k]-v)*t);polygon.push(p);intersections.push(p.slice(0,3));}
        }
        const base=vertices.length/6;
        for(const p of polygon)vertices.push(...p);
        for(let j=1;j<polygon.length-1;j++)indices.push(base,base+j,base+j+1);
      }
      const center=[0,0,0];for(const p of intersections)for(let j=0;j<3;j++)center[j]+=p[j]/intersections.length;
      intersections.sort((a,b)=>Math.atan2(a[1]-center[1],a[0]-center[0])-Math.atan2(b[1]-center[1],b[0]-center[0]));
      const normal=normalize([0,side*.62,-side]),base=vertices.length/6;
      vertices.push(...center,...normal);for(const p of intersections)vertices.push(...p,...normal);
      for(let j=0;j<intersections.length;j++)indices.push(base,base+j+1,base+(j+1)%intersections.length+1);
    }
    return {vertices,indices};
  }
  function knightHead() {
    // A carved horse silhouette with a broad neck, jaw, muzzle and tapered poll.
    const outline=[[-.20,.43],[-.26,.58],[-.27,.81],[-.24,1.04],[-.18,1.25],[-.08,1.43],
      [.01,1.53],[.12,1.55],[.23,1.48],[.28,1.38],[.40,1.31],[.52,1.27],
      [.54,1.19],[.49,1.13],[.36,1.12],[.25,1.17],[.17,1.12],[.11,.98],
      [.12,.80],[.21,.62],[.24,.48],[.16,.43]];
    const vertices=[],indices=[],rings=16,count=outline.length;
    for(let ring=0;ring<=rings;ring++){
      const angle=ring/rings*Math.PI,round=Math.sin(angle),side=-Math.cos(angle);
      for(const [z,y] of outline){const width=y>1.35?.125:y>1.1?.175:.205;
        vertices.push(side*width,.98+(y-.98)*(.83+.17*round),.10+(z-.10)*(.83+.17*round),0,0,0);
      }
    }
    for(let ring=0;ring<rings;ring++)for(let j=0;j<count;j++){
      const a=ring*count+j,b=ring*count+(j+1)%count,c=b+count,d=a+count;indices.push(a,b,c,a,c,d);
    }
    // Ear clipping keeps the concave muzzle/neck end faces inside the silhouette.
    for(const ring of [0,rings]){
      const remaining=Array.from({length:count},(_,i)=>i),signed=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
      const orientation=Math.sign(outline.reduce((sum,a,i)=>{const b=outline[(i+1)%count];return sum+a[0]*b[1]-b[0]*a[1];},0));
      let guard=0;
      while(remaining.length>2&&guard++<count*count){
        let found=false;
        for(let i=0;i<remaining.length;i++){
          const a=remaining[(i+remaining.length-1)%remaining.length],b=remaining[i],c=remaining[(i+1)%remaining.length];
          if(signed(outline[a],outline[b],outline[c])*orientation<=0)continue;
          if(remaining.some(j=>j!==a&&j!==b&&j!==c&&signed(outline[a],outline[b],outline[j])*orientation>=0&&signed(outline[b],outline[c],outline[j])*orientation>=0&&signed(outline[c],outline[a],outline[j])*orientation>=0))continue;
          const offset=ring*count;indices.push(offset+a,offset+(ring?c:b),offset+(ring?b:c));remaining.splice(i,1);found=true;break;
        }
        if(!found)break;
      }
    }
    for(let i=0;i<indices.length;i+=3){
      const points=indices.slice(i,i+3).map(index=>vertices.slice(index*6,index*6+3)),n=cross(points[1].map((v,j)=>v-points[0][j]),points[2].map((v,j)=>v-points[0][j]));
      for(const index of indices.slice(i,i+3))for(let j=0;j<3;j++)vertices[index*6+3+j]+=n[j];
    }
    for(let i=0;i<vertices.length;i+=6){const n=normalize(vertices.slice(i+3,i+6));vertices.splice(i+3,3,...n);}
    return {vertices,indices};
  }
  function cube() {
    const v=[],i=[]; const faces=[[[0,1,0],[-1,1,-1],[1,1,-1],[1,1,1],[-1,1,1]],[[0,-1,0],[-1,-1,1],[1,-1,1],[1,-1,-1],[-1,-1,-1]],[[0,0,1],[-1,-1,1],[-1,1,1],[1,1,1],[1,-1,1]],[[0,0,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,-1]],[[-1,0,0],[-1,-1,-1],[-1,1,-1],[-1,1,1],[-1,-1,1]],[[1,0,0],[1,-1,1],[1,1,1],[1,1,-1],[1,-1,-1]]];
    for(const f of faces){const base=v.length/6,n=f[0];for(const p of f.slice(1))v.push(...p,...n);i.push(base,base+1,base+2,base,base+2,base+3);} return {vertices:v,indices:i};
  }
  function pixelGlyph(rows) {
    const vertices=[],indices=[];
    for(let row=0;row<rows.length;row++)for(let col=0;col<rows[row].length;col++)if(rows[row][col]==="1"){
      const x=col-1,z=row-2,base=vertices.length/6;
      vertices.push(x-.38,0,z-.38,0,1,0, x+.38,0,z-.38,0,1,0, x+.38,0,z+.38,0,1,0, x-.38,0,z+.38,0,1,0);
      indices.push(base,base+1,base+2,base,base+2,base+3);
    }
    return {vertices,indices};
  }
  function shader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
  function mesh(gl,data){const vao=gl.createVertexArray();gl.bindVertexArray(vao);const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data.vertices),gl.STATIC_DRAW);const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(data.indices),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,24,12);return{vao,count:data.indices.length};}

  function create(canvas, callbacks={}) {
    const gl=canvas.getContext("webgl2",{antialias:true,alpha:false}); if(!gl)return null;
    let program;
    try {
      program=gl.createProgram();gl.attachShader(program,shader(gl,gl.VERTEX_SHADER,`#version 300 es\nlayout(location=0) in vec3 p;layout(location=1) in vec3 n;uniform mat4 vp;uniform mat4 mdl;out vec3 normal;out vec3 world;void main(){vec4 w=mdl*vec4(p,1.);world=w.xyz;normal=transpose(inverse(mat3(mdl)))*n;gl_Position=vp*w;}`));
      gl.attachShader(program,shader(gl,gl.FRAGMENT_SHADER,`#version 300 es
precision highp float;
in vec3 normal;in vec3 world;
uniform vec3 color;uniform vec3 eye;uniform float gloss;
uniform mat4 lightVP;uniform sampler2D shadowMap;uniform bool shadows;
out vec4 outColor;
float visibility(vec3 n,vec3 light){
  if(!shadows)return 1.;
  vec4 projected=lightVP*vec4(world,1.);vec3 p=projected.xyz/projected.w*.5+.5;
  if(p.z>1.||p.z<0.||any(lessThan(p.xy,vec2(0.)))||any(greaterThan(p.xy,vec2(1.))))return 1.;
  float bias=max(.0006,.002*(1.-max(0.,dot(n,light)))),sum=0.;vec2 texel=1./vec2(textureSize(shadowMap,0));
  for(int x=-2;x<=2;x++)for(int y=-2;y<=2;y++)sum+=p.z-bias<=texture(shadowMap,p.xy+vec2(x,y)*texel*1.4).r?1.:0.;
  return sum/25.;
}
void main(){
  vec3 n=normalize(normal),v=normalize(eye-world),key=normalize(vec3(-6.,10.,7.)),fill=normalize(vec3(.7,.5,-.65)),h=normalize(key+v);
  float d=max(0.,dot(n,key)),f=max(0.,dot(n,fill)),shadow=visibility(n,key);
  float broad=pow(max(0.,dot(n,h)),24.)*.14,fine=pow(max(0.,dot(n,h)),100.)*.25;
  float rim=pow(1.-max(0.,dot(n,v)),4.)*.09;
  float grain=(sin(world.y*95.+sin(world.x*16.+world.z*12.)*.6)+sin(world.y*193.+world.z*31.)*.35)*.004*gloss;
  float ambient=.28+.07*max(0.,n.y);
  vec3 c=color*(ambient+.65*d*shadow+.17*f+grain)+vec3(1.,.94,.82)*(broad+fine)*gloss*shadow+color*rim;
  outColor=vec4(pow(max(c,vec3(0.)),vec3(1./2.2)),1.);
}`));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
    } catch { return null; }
    const sphereProfile=Array.from({length:41},(_,i)=>{const a=-Math.PI/2+i*Math.PI/40;return[Math.sin(a),Math.cos(a)];});
    const torusProfile=Array.from({length:25},(_,i)=>{const a=i*Math.PI*2/24;return[Math.sin(a)*.18,1+Math.cos(a)*.18];});
    const meshes={cube:mesh(gl,cube()),sphere:mesh(gl,lathe(sphereProfile)),torus:mesh(gl,lathe(torusProfile)),cone:mesh(gl,lathe([[-1,.48],[-.86,.5],[.72,.16],[1,0]])),battlement:mesh(gl,battlement()),crown:mesh(gl,crown()),mitre:mesh(gl,bishopMitre()),horse:mesh(gl,knightHead())}; for(const [key,p] of Object.entries(profiles))meshes[key]=mesh(gl,lathe(p));for(const [key,rows] of Object.entries(coordinateGlyphs))meshes[`coordinate-${key}`]=mesh(gl,pixelGlyph(rows));
    const uVP=gl.getUniformLocation(program,"vp"),uModel=gl.getUniformLocation(program,"mdl"),uColor=gl.getUniformLocation(program,"color"),uEye=gl.getUniformLocation(program,"eye"),uGloss=gl.getUniformLocation(program,"gloss");
    const uLightVP=gl.getUniformLocation(program,"lightVP"),uShadows=gl.getUniformLocation(program,"shadows"),uShadowMap=gl.getUniformLocation(program,"shadowMap");
    const lightVP=multiply(new Float32Array([1/7,0,0,0,0,1/7,0,0,0,0,-2/28,0,0,0,-30/28,1]),lookAt([-6,10,7],[0,0,0],[0,1,0]));
    const depthProgram=gl.createProgram();
    gl.attachShader(depthProgram,shader(gl,gl.VERTEX_SHADER,`#version 300 es\nlayout(location=0) in vec3 p;uniform mat4 vp;uniform mat4 mdl;void main(){gl_Position=vp*mdl*vec4(p,1.);}`));
    gl.attachShader(depthProgram,shader(gl,gl.FRAGMENT_SHADER,`#version 300 es\nprecision highp float;void main(){}`));gl.linkProgram(depthProgram);
    const depthVP=gl.getUniformLocation(depthProgram,"vp"),depthModel=gl.getUniformLocation(depthProgram,"mdl");
    const shadowTexture=gl.createTexture(),shadowBuffer=gl.createFramebuffer(),shadowSize=Math.min(2048,gl.getParameter(gl.MAX_TEXTURE_SIZE));
    gl.bindTexture(gl.TEXTURE_2D,shadowTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,shadowSize,shadowSize,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER,shadowBuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,shadowTexture,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);
    const shadowsAvailable=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE&&gl.getProgramParameter(depthProgram,gl.LINK_STATUS);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    let shadowPass=false,shadowDirty=true;
    let data={board:null,flipped:false,highlights:{},movable:new Set()},drag=null,vp=null,invVP=null,cameraAngle=0,cameraPitch=.65,cameraEye=[0,8.6,10.9];
    function resize(){const d=Math.min(2,devicePixelRatio||1),w=Math.round(canvas.clientWidth*d),h=Math.round(canvas.clientHeight*d);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}gl.viewport(0,0,w,h);const distance=13.7,horizontal=Math.cos(cameraPitch)*distance;cameraEye=[Math.sin(cameraAngle)*horizontal,.3+Math.sin(cameraPitch)*distance,Math.cos(cameraAngle)*horizontal];const proj=perspective(Math.PI/4,w/h,.1,40),view=lookAt(cameraEye,[0,.3,0],[0,1,0]);vp=multiply(proj,view);invVP=inverse(vp);}
    function drawMesh(which,m,c,gloss=.18){const me=meshes[which];gl.uniformMatrix4fv(shadowPass?depthModel:uModel,false,m);if(!shadowPass){gl.uniform3fv(uColor,c);gl.uniform1f(uGloss,gloss);}gl.bindVertexArray(me.vao);gl.drawElements(gl.TRIANGLES,me.count,gl.UNSIGNED_SHORT,0);}
    function squarePosition(r,c){const vr=data.flipped?7-r:r,vc=data.flipped?7-c:c;return[vc-3.5,vr-3.5];}
    function colorForSquare(name,r,c){const h=data.highlights[name]||"";if(h.includes("review-played")||h.includes("in-check"))return[.72,.18,.16];if(h.includes("hint-to")||h.includes("review-best-to")||h.includes("selected"))return[.84,.57,.13];if(h.includes("hint-from")||h.includes("review-best-from"))return[.18,.48,.72];if(h.includes("legal")||h.includes("training-target"))return[.35,.62,.29];if(h.includes("opponent-last"))return[.73,.52,.18];return(r+c)%2?[.31,.17,.12]:[.76,.62,.4];}
    function drawPiece(piece,x,z,lift=0,scale=1){
      const type=piece.toLowerCase(),dark=piece===type,color=dark?[.038,.025,.023]:[.82,.69,.40],detail=dark?[.009,.006,.005]:[.22,.14,.055];
      const part=(which,px,py,pz,sx,sy,sz,gloss=.68)=>drawMesh(which,model(x+px*scale,lift+py*scale,z+pz*scale,sx*scale,sy*scale,sz*scale),color,gloss);
      drawMesh(type,model(x,lift,z,scale,scale,scale),color,.68);
      if(type==="p"){
        part("sphere",0,1.0,0,.205,.205,.205,.72);
      }
      if(type==="b"){
        part("mitre",0,0,0,1,1,1);
        part("sphere",0,1.79,0,.047,.052,.047,.75);
      }
      if(type==="k"){
        part("sphere",0,1.80,0,.10,.08,.10);
        part("cube",0,1.975,0,.048,.17,.048);
        part("cube",0,2.035,0,.14,.044,.048);
        for(const dx of [-.14,.14])part("sphere",dx,2.035,0,.018,.044,.048);
        part("sphere",0,2.145,0,.048,.018,.048);
      }
      if(type==="q"){
        part("crown",0,0,0,1,1,1);
        part("sphere",0,1.79,0,.125,.13,.125);
        part("sphere",0,1.94,0,.055,.055,.055,.75);
        for(let i=0;i<10;i++){const a=i*Math.PI/5;part("sphere",Math.sin(a)*.27,1.91,Math.cos(a)*.27,.025,.025,.025);}
      }
      if(type==="r"){
        for(let i=0;i<6;i++)drawMesh("battlement",modelRotY(x,lift,z,scale,scale,scale,i*Math.PI/3),color,.68);
      }
      if(type==="n"){
        const direction=(dark?1:-1)*(data.flipped?-1:1);
        drawMesh("horse",modelRotY(x,lift,z,scale,scale,scale,direction===1?0:Math.PI),color,.62);
        for(const dx of[-.09,.09])part("cone",dx,1.56,direction*.055,.045,.12,.08);
        for(let i=0;i<9;i++){
          const y=.68+i*.088,zBack=-.25+Math.max(0,y-1.0)*.38;
          drawMesh("cube",modelRotX(x,lift+y*scale,z+direction*zBack*scale,.06*scale,.026*scale,.035*scale,-direction*.3),color,.48);
        }
        for(const side of[-1,1]){
          part("sphere",side*.147,1.365,direction*.245,.023,.037,.04);
          drawMesh("sphere",model(x+side*.165*scale,lift+1.368*scale,z+direction*.256*scale,.012*scale,.02*scale,.024*scale),detail,.55);
          drawMesh("sphere",model(x+side*.125*scale,lift+1.235*scale,z+direction*.505*scale,.009*scale,.014*scale,.018*scale),detail,.3);
        }
      }
    }
    function drawCoordinates(){
      const color=[.9,.69,.27],edge=4.28,height=-.071;
      for(let c=0;c<8;c++){
        const x=squarePosition(0,c)[0],letter="abcdefgh"[c];
        drawMesh(`coordinate-${letter}`,modelRotY(x,height,edge,.16,1,.105,0),color,.25);
        drawMesh(`coordinate-${letter}`,modelRotY(x,height,-edge,.16,1,.105,Math.PI),color,.25);
      }
      for(let r=0;r<8;r++){
        const z=squarePosition(r,0)[1],rank=String(8-r);
        drawMesh(`coordinate-${rank}`,modelRotY(edge,height,z,.16,1,.105,Math.PI/2),color,.25);
        drawMesh(`coordinate-${rank}`,modelRotY(-edge,height,z,.16,1,.105,-Math.PI/2),color,.25);
      }
    }
    function drawScene(){
      drawMesh("cube",model(0,-.22,0,4.55,.14,4.55),[.19,.12,.07]);
      if(!shadowPass)drawCoordinates();
      for(let r=0;r<8;r++)for(let c=0;c<8;c++){const [x,z]=squarePosition(r,c),name="abcdefgh"[c]+(8-r);drawMesh("cube",model(x,-.055,z,.495,.055,.495),colorForSquare(name,r,c));}
      for(let r=0;r<8;r++)for(let c=0;c<8;c++){const piece=data.board[r][c],name="abcdefgh"[c]+(8-r);if(!piece||(drag?.world&&drag.movable&&drag.from===name))continue;const[x,z]=squarePosition(r,c);drawPiece(piece,x,z);}
      if(drag?.world){const[r,c]=drag.fromRC,piece=data.board[r][c];drawPiece(piece,drag.world[0],drag.world[2],.16,1.06);}
    }
    function render(){
      if(canvas.hidden||!data.board)return;
      resize();gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
      if(shadowsAvailable&&shadowDirty){
        shadowPass=true;gl.bindFramebuffer(gl.FRAMEBUFFER,shadowBuffer);gl.viewport(0,0,shadowSize,shadowSize);
        gl.clear(gl.DEPTH_BUFFER_BIT);gl.useProgram(depthProgram);gl.uniformMatrix4fv(depthVP,false,lightVP);
        gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1.5,2);drawScene();gl.disable(gl.POLYGON_OFFSET_FILL);
        shadowPass=false;shadowDirty=false;gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      }
      gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(.075,.07,.06,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.useProgram(program);gl.uniformMatrix4fv(uVP,false,vp);gl.uniform3fv(uEye,cameraEye);
      gl.uniformMatrix4fv(uLightVP,false,lightVP);gl.uniform1i(uShadows,shadowsAvailable?1:0);
      gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,shadowTexture);gl.uniform1i(uShadowMap,0);
      drawScene();
    }
    function worldAt(event){resize();const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width*2-1,y=1-(event.clientY-rect.top)/rect.height*2;const a=transform(invVP,[x,y,-1,1]),b=transform(invVP,[x,y,1,1]);for(const q of[a,b]){q[0]/=q[3];q[1]/=q[3];q[2]/=q[3];}const t=(0-a[1])/(b[1]-a[1]);return[a[0]+(b[0]-a[0])*t,0,a[2]+(b[2]-a[2])*t];}
    function squareAt(event){const w=worldAt(event),vc=Math.floor(w[0]+4),vr=Math.floor(w[2]+4);if(vc<0||vc>7||vr<0||vr>7)return{square:null,world:w};const c=data.flipped?7-vc:vc,r=data.flipped?7-vr:vr;return{square:"abcdefgh"[c]+(8-r),world:w,r,c};}
    canvas.addEventListener("pointerdown",(e)=>{const hit=squareAt(e),forcedOrbit=e.button!==0||!hit.square;e.preventDefault();canvas.setPointerCapture(e.pointerId);drag={from:hit.square,fromRC:hit.square?[hit.r,hit.c]:null,start:[e.clientX,e.clientY],startAngle:cameraAngle,startPitch:cameraPitch,world:null,orbit:false,suppressClick:e.button!==0,movable:!forcedOrbit&&data.movable.has(hit.square)};if(drag.movable)callbacks.onDragStart?.(hit.square);});
    canvas.addEventListener("pointermove",(e)=>{if(!drag)return;const dx=e.clientX-drag.start[0],dy=e.clientY-drag.start[1];if(Math.hypot(dx,dy)<=5)return;if(drag.movable){drag.world=worldAt(e);shadowDirty=true;canvas.classList.add("dragging");}else{drag.orbit=true;cameraAngle=drag.startAngle-dx*.009;cameraPitch=Math.max(.22,Math.min(1.2,drag.startPitch+dy*.007));canvas.classList.add("rotating");}render();});
    canvas.addEventListener("pointerup",(e)=>{if(!drag)return;const active=drag,hit=squareAt(e);drag=null;if(active.world)shadowDirty=true;canvas.classList.remove("dragging","rotating");if(active.orbit||active.suppressClick){render();return;}if(active.world&&active.movable&&hit.square&&hit.square!==active.from)callbacks.onDrop?.(active.from,hit.square);else if(hit.square)callbacks.onSquare?.(hit.square);render();});
    canvas.addEventListener("pointercancel",()=>{if(drag?.world)shadowDirty=true;drag=null;canvas.classList.remove("dragging","rotating");render();});
    canvas.addEventListener("contextmenu",(e)=>e.preventDefault());
    new ResizeObserver(render).observe(canvas);
    return { available:true, update(next){data=next;shadowDirty=true;render();}, rotate(){cameraAngle=(cameraAngle+Math.PI/2)%(Math.PI*2);render();}, render };
  }
  root.Chess3DView={create};
})(typeof window!=="undefined"?window:globalThis);
