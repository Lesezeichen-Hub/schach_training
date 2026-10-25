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
  const CAPTURE_IMPACT=.66,MOVE_IMPACT=.78;
  function combatPose(progress,type,attacking,effects=true){
    const raw=Math.max(0,Math.min(1,progress)),impact=attacking?CAPTURE_IMPACT:MOVE_IMPACT;
    if(!effects)return{travel:raw*raw*(3-2*raw),lift:Math.sin(raw*Math.PI)*.16,scale:1,vertical:1};
    if(raw>=1)return{travel:1,lift:0,scale:1,vertical:1};
    const windup=attacking?.12:.055,back=attacking?.025:.008;
    if(raw<windup)return{travel:-back*Math.sin(raw/windup*Math.PI/2),lift:0,scale:1,vertical:1};
    if(raw<impact){
      const t=(raw-windup)/(impact-windup),arc=attacking?({p:.5,n:1.1,b:.66,r:.26,q:.72,k:.58}[type]||.55):type==="n"?.62:.22;
      return{travel:-back+(1+back)*Math.pow(t,1.8),lift:arc*Math.sin(t*Math.PI),scale:1,vertical:1};
    }
    const t=(raw-impact)/(1-impact),compression=(attacking?.14:.075)*Math.exp(-t*9)*Math.cos(t*14);
    return{travel:1-Math.sin(t*Math.PI)*.009,lift:Math.max(0,Math.sin(t*Math.PI*3))*Math.exp(-t*5)*(attacking?.12:.055),scale:1+compression*.24,vertical:1-compression};
  }
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
    // Debris, dust and ash share one instanced draw, independent of their count.
    let particleProgram=null,particleVP=null,particleBuffer=null;
    try{
      particleProgram=gl.createProgram();
      gl.attachShader(particleProgram,shader(gl,gl.VERTEX_SHADER,`#version 300 es
layout(location=0) in vec3 p;layout(location=1) in vec3 n;
layout(location=2) in vec3 center;layout(location=3) in vec3 size;
layout(location=4) in vec3 tint;layout(location=5) in vec2 angles;layout(location=6) in float opacity;
uniform mat4 vp;out vec3 normal;out vec3 color;out float alpha;
void main(){float cx=cos(angles.x),sx=sin(angles.x),cy=cos(angles.y),sy=sin(angles.y);
mat3 rx=mat3(1.,0.,0.,0.,cx,sx,0.,-sx,cx),ry=mat3(cy,0.,-sy,0.,1.,0.,sy,0.,cy);
normal=ry*rx*n;color=tint;alpha=opacity;gl_Position=vp*vec4(center+ry*rx*(p*size),1.);}`));
      gl.attachShader(particleProgram,shader(gl,gl.FRAGMENT_SHADER,`#version 300 es
precision highp float;in vec3 normal;in vec3 color;in float alpha;out vec4 outColor;
void main(){float light=.46+.54*max(0.,dot(normalize(normal),normalize(vec3(-.5,1.,.7))));outColor=vec4(pow(max(color*light,vec3(0.)),vec3(1./2.2)),alpha);}`));
      gl.linkProgram(particleProgram);if(!gl.getProgramParameter(particleProgram,gl.LINK_STATUS))throw new Error("Partikelprogramm nicht verfügbar");
      particleVP=gl.getUniformLocation(particleProgram,"vp");particleBuffer=gl.createBuffer();
      gl.bindVertexArray(meshes.cube.vao);gl.bindBuffer(gl.ARRAY_BUFFER,particleBuffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(12),gl.DYNAMIC_DRAW);
      for(const[location,size,offset]of[[2,3,0],[3,3,3],[4,3,6],[5,2,9],[6,1,11]]){gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,size,gl.FLOAT,false,48,offset*4);gl.vertexAttribDivisor(location,1);}
    }catch{particleProgram=null;}
    const uVP=gl.getUniformLocation(program,"vp"),uModel=gl.getUniformLocation(program,"mdl"),uColor=gl.getUniformLocation(program,"color"),uEye=gl.getUniformLocation(program,"eye"),uGloss=gl.getUniformLocation(program,"gloss");
    const uLightVP=gl.getUniformLocation(program,"lightVP"),uShadows=gl.getUniformLocation(program,"shadows"),uShadowMap=gl.getUniformLocation(program,"shadowMap");
    const lightVP=multiply(new Float32Array([1/7,0,0,0,0,1/7,0,0,0,0,-2/28,0,0,0,-30/28,1]),lookAt([-6,10,7],[0,0,0],[0,1,0]));
    const depthProgram=gl.createProgram();
    gl.attachShader(depthProgram,shader(gl,gl.VERTEX_SHADER,`#version 300 es\nlayout(location=0) in vec3 p;uniform mat4 vp;uniform mat4 mdl;void main(){gl_Position=vp*mdl*vec4(p,1.);}`));
    gl.attachShader(depthProgram,shader(gl,gl.FRAGMENT_SHADER,`#version 300 es\nprecision highp float;void main(){}`));gl.linkProgram(depthProgram);
    const depthVP=gl.getUniformLocation(depthProgram,"vp"),depthModel=gl.getUniformLocation(depthProgram,"mdl");
    const shadowTexture=gl.createTexture(),shadowBuffer=gl.createFramebuffer(),shadowSize=Math.min(1024,gl.getParameter(gl.MAX_TEXTURE_SIZE));
    gl.bindTexture(gl.TEXTURE_2D,shadowTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT24,shadowSize,shadowSize,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_INT,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER,shadowBuffer);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.TEXTURE_2D,shadowTexture,0);gl.drawBuffers([gl.NONE]);gl.readBuffer(gl.NONE);
    const shadowsAvailable=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE&&gl.getProgramParameter(depthProgram,gl.LINK_STATUS);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    let shadowPass=false,shadowDirty=true,pieceDeformation=null;
    let data={board:null,flipped:false,highlights:{},movable:new Set()},drag=null,motion=null,motionFrame=0,vp=null,invVP=null,cameraAngle=0,cameraPitch=.65,cameraEye=[0,8.6,10.9],effectsEnabled=true,bursts=[],cameraKick=null,lastSelection={square:null,time:0};
    function resize(){const d=Math.min(2,devicePixelRatio||1),w=Math.round(canvas.clientWidth*d),h=Math.round(canvas.clientHeight*d);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}gl.viewport(0,0,w,h);const distance=13.7,horizontal=Math.cos(cameraPitch)*distance;cameraEye=[Math.sin(cameraAngle)*horizontal,.3+Math.sin(cameraPitch)*distance,Math.cos(cameraAngle)*horizontal];const proj=perspective(Math.PI/4,w/h,.1,40),view=lookAt(cameraEye,[0,.3,0],[0,1,0]);vp=multiply(proj,view);invVP=inverse(vp);}
    function drawMesh(which,m,c,gloss=.18){const me=meshes[which];if(pieceDeformation){m=new Float32Array(m);for(const index of[1,5,9])m[index]*=pieceDeformation.vertical;m[13]=pieceDeformation.base+(m[13]-pieceDeformation.base)*pieceDeformation.vertical;}gl.uniformMatrix4fv(shadowPass?depthModel:uModel,false,m);if(!shadowPass){gl.uniform3fv(uColor,c);gl.uniform1f(uGloss,gloss);}gl.bindVertexArray(me.vao);gl.drawElements(gl.TRIANGLES,me.count,gl.UNSIGNED_SHORT,0);}
    function squarePosition(r,c){const vr=data.flipped?7-r:r,vc=data.flipped?7-c:c;return[vc-3.5,vr-3.5];}
    function colorForSquare(name,r,c){const h=data.highlights[name]||"";if(h.includes("review-played")||h.includes("in-check"))return[.72,.18,.16];if(h.includes("hint-to")||h.includes("review-best-to")||h.includes("selected"))return[.84,.57,.13];if(h.includes("hint-from")||h.includes("review-best-from"))return[.18,.48,.72];if(h.includes("legal")||h.includes("training-target"))return[.35,.62,.29];if(h.includes("opponent-last"))return[.73,.52,.18];return(r+c)%2?[.31,.17,.12]:[.76,.62,.4];}
    function drawPiece(piece,x,z,lift=0,scale=1,vertical=1){
      const previousDeformation=pieceDeformation;pieceDeformation=vertical===1?null:{base:lift,vertical};
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
      pieceDeformation=previousDeformation;
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
    function motionProgress(now=performance.now()){
      return motion?Math.max(0,Math.min(1,(now-motion.start)/motion.duration)):0;
    }
    function effectSquarePosition(square){
      if(!square)return[0,0];
      const c=square.charCodeAt(0)-97,r=8-Number(square[1]);
      return squarePosition(r,c);
    }
    function effectPalette(piece){
      const dark=piece&&piece===piece.toLowerCase();
      return dark?[[.12,.14,.15],[.32,.34,.33]]:[[.46,.44,.38],[.66,.63,.55]];
    }
    const combatProfiles={p:{count:170,power:1.25},n:{count:235,power:1.48},b:{count:215,power:1.4},r:{count:280,power:1.65},q:{count:320,power:1.8},k:{count:230,power:1.45}};
    const scatter=(i,seed=0)=>{const value=Math.sin(i*12.9898+seed*7.233)*43758.5453;return value-Math.floor(value);};
    function queueBurst(burst){bursts.push(burst);if(bursts.length>28)bursts.shift();}
    function shatterPiece(piece,x,z,start,power,direction){
      const type=piece.toLowerCase(),profile=profiles[type],palette=effectPalette(piece),particles=[];
      const facing=(piece===type?1:-1)*(data.flipped?-1:1),step=.09;
      const radiusAt=y=>{
        let radius=0;
        for(let i=1;i<profile.length;i++){
          const[a,ra]=profile[i-1],[b,rb]=profile[i];
          if(y>=Math.min(a,b)&&y<=Math.max(a,b)&&a!==b)radius=Math.max(radius,ra+(rb-ra)*(y-a)/(b-a));
        }
        return radius;
      };
      const inside=(px,py,pz)=>{
        if(px*px+pz*pz<=radiusAt(py)**2)return true;
        if(type==="p")return px*px+(py-1)**2+pz*pz<=.205**2;
        if(type==="b")return(px/.205)**2+((py-1.55)/.26)**2+(pz/.205)**2<=1;
        if(type==="r")return py>1.23&&py<1.47&&px*px+pz*pz<.285**2&&(py<1.31||Math.cos(Math.atan2(px,pz)*6)>.05);
        if(type==="q")return py>1.57&&py<1.97&&px*px+pz*pz<(.16+.12*Math.max(0,(py-1.64)/.33))**2;
        if(type==="k")return(Math.abs(px)<.055&&Math.abs(pz)<.055&&py<2.17&&py>1.77)||(Math.abs(px)<.15&&Math.abs(pz)<.055&&Math.abs(py-2.035)<.055);
        if(type==="n"){const nose=pz*facing;return(px/.2)**2+((py-.97)/.56)**2+((nose+.035)/.25)**2<=1||(Math.abs(px)<.16&&py>1.12&&py<1.4&&nose>.05&&nose<.5);}
        return false;
      };
      let index=0;
      for(let py=step/2;py<2.2;py+=step)for(let px=-.405;px<=.405;px+=step)for(let pz=-.405;pz<=.495;pz+=step){
        if(!inside(px,py,pz))continue;
        const random=scatter(++index,py*13),radius=Math.hypot(px,pz)||1,speed=power*(1.4+random*2.2);
        particles.push({kind:"chunk",offsetX:px,offsetZ:pz,height:py,delay:Math.max(0,.065-py*.035),
          vx:px/radius*speed+direction[0]*power*1.7,vz:pz/radius*speed+direction[1]*power*1.7,
          vy:power*(1.7+scatter(index+7,2)*2.2),size:step*.48,flat:.8+random*.4,
          life:1.25+random*.75,color:palette[index%4?0:1],spin:random*.2});
      }
      queueBurst({type:"burst",style:"shatter",x,z,start,particles,life:2.1,power});
    }
    function boardDisplacement(x,z,now){
      if(!effectsEnabled)return 0;
      let displacement=0;
      for(const burst of bursts){
        if(burst.type!=="slam")continue;
        const distance=Math.hypot(x-burst.x,z-burst.z),age=(now-burst.start)/1000-distance/11;
        if(age<0||age>.65)continue;
        displacement-=Math.cos(age*35)*Math.exp(-age*9)*.045*burst.power/(1+distance*1.7);
      }
      return Math.max(-.045,Math.min(.06,displacement));
    }
    function particleBurst(x,z,start,piece,count=100,power=1,direction=[0,0],style="impact",attackerType="p"){
      const[stone,edge]=effectPalette(piece),particles=[],seed=x*17+z*31+count;
      for(let i=0;i<count;i++){
        const random=scatter(i+1,seed),dust=i%5<2,ember=style==="impact"&&i%31===0,ash=style==="ash",slash=style==="impact"&&attackerType==="b",siege=style==="impact"&&attackerType==="r";
        const angle=slash?Math.atan2(direction[1],direction[0])+(random-.5)*1.2:i*2.39996+random*.65;
        const speed=(.65+random*2.6)*power,kind=dust?"dust":ash?"ash":"shard",thrust=slash?1.7:attackerType==="p"?1.2:.85;
        particles.push({kind,vx:Math.cos(angle)*speed+direction[0]*power*thrust,vz:Math.sin(angle)*speed+direction[1]*power*thrust,
          vy:dust?.18+random*.5:(.9+scatter(i+15,seed)*(siege?1.1:2.2))*power,
          height:style==="impact"&&!dust?.12+scatter(i+21,seed)*1.15:.05,
          size:dust?.095+random*.15:(.018+random*.054)*(siege?1.35:slash?.75:1),
          life:dust?1+random*.6:ash?1.4+random*.4:.65+random*.65,
          color:dust?[.19+random*.06,.18+random*.06,.16+random*.06]:ember?[.78,.32,.09]:i%3?stone:edge,
          spin:i*.47,flat:slash?.16:.25+scatter(i+9,seed)*.8});
      }
      queueBurst({type:"burst",x,z,start,particles,life:1.85,power,style});
    }
    function cinematicKick(kind){
      if(!canvas.animate)return;
      const distance={move:1.2,capture:6.8,check:2.8,checkmate:9,castle:3,promotion:4,draw:.5}[kind]||1;
      cameraKick?.cancel();
      cameraKick=canvas.animate([{transform:"translate(0)"},{transform:`translate(${distance}px, ${-distance*.65}px)`},{transform:`translate(${-distance*.8}px, ${distance*.4}px)`},{transform:`translate(${distance*.35}px, ${-distance*.2}px)`},{transform:"translate(0)"}],{duration:kind==="checkmate"?360:240,easing:"ease-out"});
    }
    function triggerCinematicEffects(now=performance.now()){
      if(!motion||motion.cueTriggered||!effectsEnabled||!motion.effects)return;
      motion.cueTriggered=true;
      motion.impact=Boolean(motion.capturedPiece);
      const kind=motion.effectKind||(motion.capturedPiece?"capture":"move"),[x,z]=effectSquarePosition(motion.to),[fx,fz]=effectSquarePosition(motion.from);
      const length=Math.hypot(x-fx,z-fz)||1,direction=[(x-fx)/length,(z-fz)/length],profile=combatProfiles[motion.piece.toLowerCase()]||combatProfiles.p;
      queueBurst({type:"slam",x,z,start:now,life:.85,power:motion.capturedPiece?profile.power:kind==="castle"?1:.6});
      if(!motion.capturedPiece){
        particleBurst(x,z,now,motion.piece,kind==="castle"?100:80,.66,direction,"ground");
        queueBurst({type:"landing",x,z,start:now,life:.55});
      }
      if(motion.capturedPiece){
        const[cx,cz]=effectSquarePosition(motion.captureSquare||motion.to);
        shatterPiece(motion.capturedPiece,cx,cz,now,profile.power,direction);
        particleBurst(cx,cz,now,motion.capturedPiece,profile.count,profile.power,direction,"impact",motion.piece.toLowerCase());
        particleBurst(cx+direction[0]*.12,cz+direction[1]*.12,now+65,motion.capturedPiece,110,1.05,direction,"ground");
      }
      if(motion.rookFrom&&motion.rookTo){
        const[rx,rz]=effectSquarePosition(motion.rookTo);
        queueBurst({type:"castle",x,z,rx,rz,start:now,life:.9});
        particleBurst(rx,rz,now+30,motion.rookPiece,110,.85,direction,"ground");
        queueBurst({type:"slam",x:rx,z:rz,start:now,life:.85,power:1});
      }
      if(motion.promotion){
        queueBurst({type:"promotion",x,z,start:now,life:1.2,palette:effectPalette(motion.piece)});
        particleBurst(x,z,now,motion.piece,112,.8,[0,0]);
      }
      if(motion.checkedKingSquare){
        const[kx,kz]=effectSquarePosition(motion.checkedKingSquare);
        queueBurst({type:kind==="checkmate"?"checkmate":"check",x:kx,z:kz,start:now,life:kind==="checkmate"?1.7:1.1});
        queueBurst({type:"threat",x,z,tx:kx,tz:kz,start:now,life:.34});
        particleBurst(kx,kz,now+100,checkedKingPiece(motion),kind==="checkmate"?260:80,kind==="checkmate"?1.35:.6,direction,kind==="checkmate"?"impact":"ground");
        if(kind==="checkmate"){
          queueBurst({type:"slam",x:kx,z:kz,start:now+100,life:.85,power:1.5});
          for(let i=0;i<2;i++)particleBurst(kx+(i?-.24:.25),kz+(i?.2:-.18),now+210+i*135,checkedKingPiece(motion),150,1.15,[0,0]);
        }
      }
      if(kind==="draw"){
        particleBurst(x,z,now,motion.piece,75,.32,[0,0],"ash");
      }
      cinematicKick(kind);
      try{motion.onImpact?.();}catch{ /* A failed audio device must not stall a move. */ }
    }
    function checkedKingPiece(activeMotion){return activeMotion.piece===activeMotion.piece.toLowerCase()?"K":"k";}
    function drawParticleBatch(items){
      if(!items.length)return;
      if(!particleProgram){for(const p of items.slice(0,96))drawMesh("cube",modelRotY(...p.position,...p.size,p.angles[1]),p.color,.1);return;}
      const sorted=items.length>1800?items.slice().sort((a,b)=>b.priority-a.priority).slice(0,1800):items.slice();
      for(const p of sorted)p.distance=(p.position[0]-cameraEye[0])**2+(p.position[1]-cameraEye[1])**2+(p.position[2]-cameraEye[2])**2;
      sorted.sort((a,b)=>b.distance-a.distance);
      const values=new Float32Array(sorted.length*12);
      sorted.forEach((p,i)=>values.set([...p.position,...p.size,...p.color,...p.angles,p.alpha],i*12));
      gl.useProgram(particleProgram);gl.uniformMatrix4fv(particleVP,false,vp);
      gl.bindVertexArray(meshes.cube.vao);gl.bindBuffer(gl.ARRAY_BUFFER,particleBuffer);gl.bufferData(gl.ARRAY_BUFFER,values,gl.DYNAMIC_DRAW);
      gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
      gl.drawElementsInstanced(gl.TRIANGLES,meshes.cube.count,gl.UNSIGNED_SHORT,0,sorted.length);
      gl.depthMask(true);gl.disable(gl.BLEND);gl.useProgram(program);
    }
    function drawEffects(now=performance.now()){
      if(shadowPass||!effectsEnabled)return;
      bursts=bursts.filter(burst=>(now-burst.start)/1000<burst.life);
      const debris=[];
      const cube=(position,size,color,angles=[0,0],alpha=1,priority=0)=>{if(alpha>.008&&size.every(n=>n>.001))debris.push({position,size,color,angles,alpha,priority});};
      const brackets=(x,z,fade,color)=>{
        for(const dx of[-1,1])for(const dz of[-1,1]){
          cube([x+dx*.43-dx*.09,.025,z+dz*.43],[.11,.012*fade,.018],color);
          cube([x+dx*.43,.025,z+dz*.43-dz*.09],[.018,.012*fade,.11],color);
        }
      };
      for(const burst of bursts){
        const age=(now-burst.start)/1000;if(age<0)continue;
        const t=Math.min(1,age/burst.life),fade=1-t;
        if(burst.type==="burst"){
          if(burst.style==="impact"){
            cube([burst.x,.016,burst.z],[.32*fade,.009,.32*fade],[.065,.062,.054]);
            for(let i=0;i<6;i++){const a=i*2.39996;cube([burst.x+Math.cos(a)*.25,.022,burst.z+Math.sin(a)*.25],[.018*fade,.006,.28*fade],[.09,.083,.07],[0,a]);}
            if(age<.065)for(let i=0;i<4;i++){const s=(1-age/.065)*burst.power;cube([burst.x,.25+i*.08,burst.z],[.07*s,.035*s,(.34+i*.08)*s],[.86,.74,.54],[i*.8,i*1.7],.8);}
          }
          for(const particle of burst.particles){
            const elapsed=Math.max(0,age-(particle.delay||0)),pt=Math.min(1,elapsed/particle.life);if(pt>=1)continue;
            const pf=1-pt,dust=particle.kind==="dust",ash=particle.kind==="ash",chunk=particle.kind==="chunk",drag=dust?1.1:1.7,travel=(1-Math.exp(-elapsed*drag))/drag;
            const px=burst.x+(particle.offsetX||0)+particle.vx*travel,pz=burst.z+(particle.offsetZ||0)+particle.vz*travel;
            let py=dust?particle.height+elapsed*.5:ash?particle.height+particle.vy*elapsed-.35*elapsed*elapsed:particle.height+particle.vy*elapsed-4.8*elapsed*elapsed;
            if(!dust&&!ash&&py<.025){const hit=(particle.vy+Math.sqrt(particle.vy**2+19.2*particle.height))/9.6,bounce=elapsed-hit;py=.025+Math.max(0,(particle.vy+4.8*hit)*.2*bounce-4.8*bounce*bounce);}
            const size=particle.size*(dust?(.55+elapsed*1.8)*pf:Math.min(1,pf*3));
            cube([px,Math.max(.025,py),pz],[size*(dust?1.6:1),size*(dust?.55:particle.flat),size],particle.color,[particle.spin+elapsed*(dust?.2:7),particle.spin+elapsed*(dust?.3:5)],dust?Math.min(1,elapsed*20)*pf*.4:ash?pf*.6:Math.min(1,pf*4),chunk?3:dust?0:1);
          }
        }else if(burst.type==="landing"){
          for(let i=0;i<18;i++){const a=i*2.39996,r=.18+t*.65,s=.04*fade;cube([burst.x+Math.cos(a)*r,.035,burst.z+Math.sin(a)*r],[s,.013,s*1.8],[.29,.27,.23],[0,a],fade*.55);}
        }else if(burst.type==="check"||burst.type==="checkmate"){
          brackets(burst.x,burst.z,fade,burst.type==="checkmate"?[.36,.12,.055]:[.32,.22,.13]);
          if(burst.type==="checkmate")for(let i=0;i<8;i++){const a=i*Math.PI/4;cube([burst.x+Math.cos(a)*.65,.025,burst.z+Math.sin(a)*.65],[.012,.007,.24*fade],[.10,.095,.08],[0,-a]);}
        }else if(burst.type==="threat"){
          const travel=Math.min(1,age/.12);
          for(let i=0;i<12;i++){const q=Math.max(0,travel-i*.025),s=.017*(1-i/14)*fade;cube([burst.x+(burst.tx-burst.x)*q,.12,burst.z+(burst.tz-burst.z)*q],[s,s*.5,s*2],[.58,.54,.44],[0,Math.atan2(burst.tx-burst.x,burst.tz-burst.z)],fade*.7);}
        }else if(burst.type==="promotion"){
          for(let i=0;i<45;i++){const a=i*2.39996,r=.16+scatter(i,3)*.25+age*.25,h=.1+(i%9)*.19+Math.sin(t*Math.PI)*.55,s=(.025+i%4*.013)*fade;cube([burst.x+Math.cos(a)*r,h,burst.z+Math.sin(a)*r],[s,s*.4,s*1.8],burst.palette[i%2],[age*5+i,a],Math.min(1,fade*2));}
        }else if(burst.type==="castle"){
          brackets(burst.x,burst.z,fade,[.3,.31,.28]);brackets(burst.rx,burst.rz,fade,[.3,.31,.28]);
        }else if(burst.type==="selection"){
          brackets(burst.x,burst.z,fade,[.42,.44,.4]);
        }
      }
      if(motion?.effects&&!motion.cueTriggered){
        const raw=motionProgress(now),travel=combatPose(raw,motion.piece.toLowerCase(),Boolean(motion.capturedPiece)).travel,[fx,fz]=effectSquarePosition(motion.from),[tx,tz]=effectSquarePosition(motion.to);
        for(let i=0;i<38;i++){const q=Math.max(0,travel-i*.012),a=i*2.39996,s=(.018+(i%4)*.01)*(1-i/45);cube([fx+(tx-fx)*q+Math.cos(a)*.09,.05+(i%4)*.018,fz+(tz-fz)*q+Math.sin(a)*.09],[s*1.4,s*.5,s],[.23,.23,.21],[i,raw*6],.65*(1-i/42));}
      }
      drawParticleBatch(debris);
    }
    function drawScene(){
      const now=performance.now();
      drawMesh("cube",model(0,-.22,0,4.55,.14,4.55),[.19,.12,.07]);
      if(!shadowPass)drawCoordinates();
      for(let r=0;r<8;r++)for(let c=0;c<8;c++){const [x,z]=squarePosition(r,c),name="abcdefgh"[c]+(8-r);drawMesh("cube",model(x,-.055+boardDisplacement(x,z,now),z,.495,.055,.495),colorForSquare(name,r,c));}
      for(let r=0;r<8;r++)for(let c=0;c<8;c++){
        const piece=data.board[r][c],name="abcdefgh"[c]+(8-r);if(!piece||(drag?.world&&drag.movable&&drag.from===name)||motion?.from===name||motion?.rookFrom===name)continue;
        const[x,z]=squarePosition(r,c);
        if(motion?.effects&&effectsEnabled&&motion.capturedPiece&&motion.captureSquare===name){
          if(motion.impact)continue;
          const progress=motionProgress(),danger=Math.max(0,(progress-.48)/.18),shake=Math.sin(progress*72)*.019*danger;
          drawPiece(piece,x+shake,z-shake*.45,0,1+danger*.012);continue;
        }
        drawPiece(piece,x,z,boardDisplacement(x,z,now));
      }
      if(drag?.world){const[r,c]=drag.fromRC,piece=data.board[r][c];drawPiece(piece,drag.world[0],drag.world[2],.16,1.06);}
      if(motion){
        const fr=8-Number(motion.from[1]),fc=motion.from.charCodeAt(0)-97,tr=8-Number(motion.to[1]),tc=motion.to.charCodeAt(0)-97,[fx,fz]=squarePosition(fr,fc),[tx,tz]=squarePosition(tr,tc),raw=motionProgress();
        const cinematic=Boolean(motion.effects&&effectsEnabled),attacking=Boolean(motion.capturedPiece),pieceType=(motion.piece||"p").toLowerCase();
        const pose=combatPose(raw,pieceType,attacking,cinematic),x=fx+(tx-fx)*pose.travel,z=fz+(tz-fz)*pose.travel;
        const lift=pose.lift+boardDisplacement(x,z,now);
        const shownPiece=motion.promotion&&raw>.72?(motion.piece===motion.piece.toUpperCase()?motion.promotion.toUpperCase():motion.promotion):motion.piece;
        drawPiece(shownPiece,x,z,lift,pose.scale,pose.vertical);
        if(motion.rookFrom&&motion.rookTo){
          const[rfx,rfz]=effectSquarePosition(motion.rookFrom),[rtx,rtz]=effectSquarePosition(motion.rookTo),rookPose=combatPose(raw,"r",false,cinematic),rx=rfx+(rtx-rfx)*rookPose.travel,rz=rfz+(rtz-rfz)*rookPose.travel;
          drawPiece(motion.rookPiece,rx,rz,rookPose.lift+boardDisplacement(rx,rz,now),rookPose.scale,rookPose.vertical);
        }
      }
      drawEffects();
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
    function pointerRay(event){
      resize();
      const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width*2-1,y=1-(event.clientY-rect.top)/rect.height*2;
      const near=transform(invVP,[x,y,-1,1]),far=transform(invVP,[x,y,1,1]);
      for(const point of[near,far])for(let axis=0;axis<3;axis++)point[axis]/=point[3];
      return[near,far];
    }
    function groundAt(ray){
      const[near,far]=ray,t=-near[1]/(far[1]-near[1]);
      return[near[0]+(far[0]-near[0])*t,0,near[2]+(far[2]-near[2])*t];
    }
    function worldAt(event){return groundAt(pointerRay(event));}
    function pieceAt(ray){
      if(!data.board)return null;
      const[near,far]=ray,dx=far[0]-near[0],dy=far[1]-near[1],dz=far[2]-near[2],horizontal=dx*dx+dz*dz;
      const heights={p:.9,r:1.48,n:1.6,b:1.82,q:2.02,k:2.2};
      let closest=null,nearest=Infinity;
      for(let r=0;r<8;r++)for(let c=0;c<8;c++){
        const piece=data.board[r][c],square="abcdefgh"[c]+(8-r);
        if(!piece||(drag?.world&&drag.from===square))continue;
        const[x,z]=squarePosition(r,c),radius=piece.toLowerCase()==="n"?.5:.43,height=heights[piece.toLowerCase()],ox=near[0]-x,oz=near[2]-z;
        const candidates=[];
        if(horizontal>1e-8){
          const linear=2*(ox*dx+oz*dz),constant=ox*ox+oz*oz-radius*radius,discriminant=linear*linear-4*horizontal*constant;
          if(discriminant>=0){const root=Math.sqrt(discriminant);candidates.push((-linear-root)/(2*horizontal),(-linear+root)/(2*horizontal));}
        }
        if(Math.abs(dy)>1e-8)candidates.push((height-near[1])/dy);
        for(const t of candidates){
          if(t<0||t>1||t>=nearest)continue;
          const px=near[0]+dx*t-x,py=near[1]+dy*t,pz=near[2]+dz*t-z;
          if(py<.03||py>height||px*px+pz*pz>radius*radius+.0001)continue;
          nearest=t;closest={square,r,c};
        }
      }
      return closest;
    }
    function squareAt(event){
      const ray=pointerRay(event),world=groundAt(ray);
      const vc=Math.floor(world[0]+4),vr=Math.floor(world[2]+4);
      if(vc>=0&&vc<=7&&vr>=0&&vr<=7){
        const c=data.flipped?7-vc:vc,r=data.flipped?7-vr:vr,square="abcdefgh"[c]+(8-r);
        if(data.board?.[r]?.[c]||data.highlights[square]?.includes("legal"))return{square,world,r,c};
      }
      const piece=pieceAt(ray);
      if(piece)return{...piece,world};
      if(vc<0||vc>7||vr<0||vr>7)return{square:null,world};
      const c=data.flipped?7-vc:vc,r=data.flipped?7-vr:vr;
      return{square:"abcdefgh"[c]+(8-r),world,r,c};
    }
    canvas.addEventListener("pointerdown",(e)=>{const hit=squareAt(e),forcedOrbit=e.button!==0||!hit.square;e.preventDefault();canvas.setPointerCapture(e.pointerId);drag={from:hit.square,fromRC:hit.square?[hit.r,hit.c]:null,start:[e.clientX,e.clientY],startAngle:cameraAngle,startPitch:cameraPitch,world:null,orbit:false,suppressClick:e.button!==0,movable:!forcedOrbit&&data.movable.has(hit.square)};if(drag.movable)callbacks.onDragStart?.(hit.square);});
    canvas.addEventListener("pointermove",(e)=>{if(!drag)return;const dx=e.clientX-drag.start[0],dy=e.clientY-drag.start[1];if(Math.hypot(dx,dy)<=5)return;if(drag.movable){drag.world=worldAt(e);shadowDirty=true;canvas.classList.add("dragging");}else{drag.orbit=true;cameraAngle=drag.startAngle-dx*.009;cameraPitch=Math.max(.22,Math.min(1.2,drag.startPitch+dy*.007));canvas.classList.add("rotating");}render();});
    canvas.addEventListener("pointerup",(e)=>{if(!drag)return;const active=drag,hit=squareAt(e);drag=null;if(active.world)shadowDirty=true;canvas.classList.remove("dragging","rotating");if(active.orbit||active.suppressClick){render();return;}if(active.world&&active.movable&&hit.square&&hit.square!==active.from)callbacks.onDrop?.(active.from,hit.square);else if(hit.square)callbacks.onSquare?.(hit.square);render();});
    canvas.addEventListener("pointercancel",()=>{if(drag?.world)shadowDirty=true;drag=null;canvas.classList.remove("dragging","rotating");render();});
    canvas.addEventListener("contextmenu",(e)=>e.preventDefault());
    new ResizeObserver(render).observe(canvas);
    function effectsAllowed(){return effectsEnabled&&!root.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;}
    function queueEffectsFrame(){if(!motionFrame)motionFrame=requestAnimationFrame(stepEffects);}
    function stepEffects(){
      motionFrame=0;
      const now=performance.now(),active=motion;
      if(active){
        if(active.effects&&(now-active.start)/active.duration>=(active.capturedPiece ? CAPTURE_IMPACT : MOVE_IMPACT))triggerCinematicEffects(now);
        shadowDirty=true;
        if(now-active.start>=active.duration){motion=null;active.done?.();}
      }
      if(bursts.some(burst=>burst.type==="slam"&&now-burst.start<850))shadowDirty=true;
      render();
      if(motion||(effectsEnabled&&bursts.some(burst=>(now-burst.start)/1000<burst.life)))queueEffectsFrame();
    }
    function clearEffects(){
      cancelAnimationFrame(motionFrame);motionFrame=0;motion=null;bursts=[];cameraKick?.cancel();cameraKick=null;shadowDirty=true;render();
    }
    return {
      available:true,
      update(next){
        if(next.flipped!==data.flipped)for(const burst of bursts){
          for(const key of["x","z","rx","rz","tx","tz"])if(Number.isFinite(burst[key]))burst[key]*=-1;
          for(const particle of burst.particles||[]){particle.vx*=-1;particle.vz*=-1;if(particle.offsetX)particle.offsetX*=-1;if(particle.offsetZ)particle.offsetZ*=-1;}
        }
        data=next;shadowDirty=true;render();
      },
      setEffectsEnabled(value){effectsEnabled=Boolean(value);if(!effectsEnabled){bursts=[];cameraKick?.cancel();if(motion)motion.effects=false;}shadowDirty=true;render();},
      clearEffects,
      signalSquare(square,piece){
        const now=performance.now();if(!effectsAllowed()||(lastSelection.square===square&&now-lastSelection.time<200))return;
        lastSelection={square,time:now};const[x,z]=effectSquarePosition(square);
        queueBurst({type:"selection",x,z,start:now,life:.32});particleBurst(x,z,now,piece,16,.18,[0,0],"ground");queueEffectsFrame();
      },
      animateMove(next,done){
        cancelAnimationFrame(motionFrame);
        motionFrame=0;
        const start=performance.now(),duration=Math.max(1,next.duration||1);
        const active={...next,start,duration,impact:false,cueTriggered:false,effects:Boolean(next.effects&&effectsAllowed()),done};motion=active;
        if(active.effects){const[fx,fz]=effectSquarePosition(active.from);particleBurst(fx,fz,start,active.piece,30,.28,[0,0],"ground");}
        queueEffectsFrame();
        return{
          cancel(){if(motion===active)clearEffects();},
          finish(){if(motion!==active)return;if(active.effects&&!active.cueTriggered)triggerCinematicEffects();motion=null;shadowDirty=true;active.done?.();render();if(bursts.length)queueEffectsFrame();}
        };
      },
      rotate(){cameraAngle=(cameraAngle+Math.PI/2)%(Math.PI*2);render();},
      render
    };
  }
  root.Chess3DView={create,combatPose};
})(typeof window!=="undefined"?window:globalThis);
