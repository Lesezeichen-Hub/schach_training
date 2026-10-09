(function (root) {
  "use strict";

  const profiles = {
    p: [[0,.35],[.035,.41],[.085,.43],[.14,.39],[.19,.29],[.24,.27],[.5,.18],[.58,.17],[.63,.23],[.68,.29],[.76,.32],[.84,.29],[.91,.2],[.97,.07],[1,0]],
    r: [[0,.4],[.035,.46],[.09,.47],[.15,.41],[.2,.31],[.25,.29],[.61,.25],[.68,.3],[.72,.38],[.78,.39],[.82,.32],[.91,.32],[.94,.4],[1,.4]],
    n: [[0,.4],[.035,.46],[.09,.47],[.15,.4],[.2,.3],[.27,.27],[.31,.25],[.34,.23]],
    b: [[0,.4],[.035,.46],[.09,.47],[.15,.4],[.2,.3],[.25,.28],[.57,.2],[.64,.18],[.69,.28],[.74,.32],[.8,.27],[.85,.2],[.91,.24],[.96,.15],[1,0]],
    q: [[0,.42],[.035,.48],[.09,.49],[.15,.42],[.2,.31],[.25,.29],[.59,.21],[.66,.2],[.7,.31],[.75,.38],[.8,.35],[.84,.25],[.88,.28],[.91,.34],[.94,.31],[.97,.2],[1,.13]],
    k: [[0,.42],[.035,.48],[.09,.49],[.15,.42],[.2,.31],[.25,.29],[.61,.21],[.68,.2],[.72,.31],[.77,.39],[.82,.36],[.87,.23],[.92,.2],[.96,.29],[1,.19]]
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

  function lathe(profile, segments=36) {
    const vertices=[], indices=[];
    for(let i=0;i<profile.length;i++) {
      const [y,rad]=profile[i], prev=profile[Math.max(0,i-1)], next=profile[Math.min(profile.length-1,i+1)];
      const slope=(next[1]-prev[1])/(next[0]-prev[0]||1);
      for(let s=0;s<=segments;s++) { const a=s/segments*Math.PI*2, ca=Math.cos(a), sa=Math.sin(a), n=normalize([ca,-slope,sa]); vertices.push(rad*ca,y,rad*sa,n[0],n[1],n[2]); }
    }
    for(let i=0;i<profile.length-1;i++) for(let s=0;s<segments;s++) { const a=i*(segments+1)+s,b=a+segments+1; indices.push(a,b,a+1,a+1,b,b+1); }
    return {vertices,indices};
  }
  function cube() {
    const v=[],i=[]; const faces=[[[0,1,0],[-1,1,-1],[1,1,-1],[1,1,1],[-1,1,1]],[[0,-1,0],[-1,-1,1],[1,-1,1],[1,-1,-1],[-1,-1,-1]],[[0,0,1],[-1,-1,1],[-1,1,1],[1,1,1],[1,-1,1]],[[0,0,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,-1]],[[-1,0,0],[-1,-1,-1],[-1,1,-1],[-1,1,1],[-1,-1,1]],[[1,0,0],[1,-1,1],[1,1,1],[1,1,-1],[1,-1,-1]]];
    for(const f of faces){const base=v.length/6,n=f[0];for(const p of f.slice(1))v.push(...p,...n);i.push(base,base+1,base+2,base,base+2,base+3);} return {vertices:v,indices:i};
  }
  function shader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
  function mesh(gl,data){const vao=gl.createVertexArray();gl.bindVertexArray(vao);const vb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data.vertices),gl.STATIC_DRAW);const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(data.indices),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,24,12);return{vao,count:data.indices.length};}

  function create(canvas, callbacks={}) {
    const gl=canvas.getContext("webgl2",{antialias:true,alpha:false}); if(!gl)return null;
    let program;
    try {
      program=gl.createProgram();gl.attachShader(program,shader(gl,gl.VERTEX_SHADER,`#version 300 es\nlayout(location=0) in vec3 p;layout(location=1) in vec3 n;uniform mat4 vp;uniform mat4 mdl;out vec3 normal;out vec3 world;void main(){vec4 w=mdl*vec4(p,1.);world=w.xyz;normal=mat3(mdl)*n;gl_Position=vp*w;}`));
      gl.attachShader(program,shader(gl,gl.FRAGMENT_SHADER,`#version 300 es\nprecision highp float;in vec3 normal;in vec3 world;uniform vec3 color;uniform vec3 eye;uniform float gloss;out vec4 outColor;void main(){vec3 n=normalize(normal),l=normalize(vec3(-.5,1.,.65)),v=normalize(eye-world),h=normalize(l+v);float d=max(.0,dot(n,l));float spec=pow(max(0.,dot(n,h)),mix(10.,34.,gloss))*gloss;float rim=pow(1.-max(0.,dot(n,v)),3.)*.16;vec3 c=color*(.3+.7*d)+vec3(.72,.66,.52)*spec*.42+color*rim;outColor=vec4(pow(c,vec3(.86)),1.);}`));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
    } catch { return null; }
    const sphereProfile=Array.from({length:17},(_,i)=>{const a=-Math.PI/2+i*Math.PI/16;return[Math.sin(a),Math.cos(a)];});
    const meshes={cube:mesh(gl,cube()),sphere:mesh(gl,lathe(sphereProfile)),cone:mesh(gl,lathe([[-1,.48],[-.86,.5],[.72,.16],[1,0]]))}; for(const [key,p] of Object.entries(profiles))meshes[key]=mesh(gl,lathe(p));
    const uVP=gl.getUniformLocation(program,"vp"),uModel=gl.getUniformLocation(program,"mdl"),uColor=gl.getUniformLocation(program,"color"),uEye=gl.getUniformLocation(program,"eye"),uGloss=gl.getUniformLocation(program,"gloss");
    let data={board:null,flipped:false,highlights:{},movable:new Set()},drag=null,vp=null,invVP=null,cameraAngle=0,cameraPitch=.65,cameraEye=[0,8.6,10.9];
    function resize(){const d=Math.min(2,devicePixelRatio||1),w=Math.round(canvas.clientWidth*d),h=Math.round(canvas.clientHeight*d);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}gl.viewport(0,0,w,h);const distance=13.7,horizontal=Math.cos(cameraPitch)*distance;cameraEye=[Math.sin(cameraAngle)*horizontal,.3+Math.sin(cameraPitch)*distance,Math.cos(cameraAngle)*horizontal];const proj=perspective(Math.PI/4,w/h,.1,40),view=lookAt(cameraEye,[0,.3,0],[0,1,0]);vp=multiply(proj,view);invVP=inverse(vp);}
    function drawMesh(which,m,c,gloss=.18){const me=meshes[which];gl.uniformMatrix4fv(uModel,false,m);gl.uniform3fv(uColor,c);gl.uniform1f(uGloss,gloss);gl.bindVertexArray(me.vao);gl.drawElements(gl.TRIANGLES,me.count,gl.UNSIGNED_SHORT,0);}
    function squarePosition(r,c){const vr=data.flipped?7-r:r,vc=data.flipped?7-c:c;return[vc-3.5,vr-3.5];}
    function colorForSquare(name,r,c){const h=data.highlights[name]||"";if(h.includes("review-played")||h.includes("in-check"))return[.72,.18,.16];if(h.includes("hint-to")||h.includes("review-best-to")||h.includes("selected"))return[.84,.57,.13];if(h.includes("hint-from")||h.includes("review-best-from"))return[.18,.48,.72];if(h.includes("legal")||h.includes("training-target"))return[.35,.62,.29];if(h.includes("opponent-last"))return[.73,.52,.18];return(r+c)%2?[.31,.17,.12]:[.76,.62,.4];}
    function drawPiece(piece,x,z,lift=0,scale=1){const type=piece.toLowerCase(),dark=piece===type,color=dark?[.105,.075,.068]:[.86,.74,.5],top=lift+1.55*scale;drawMesh(type,model(x,lift,z,.82*scale,1.55*scale,.82*scale),color,.72);
      if(type==="k"){
        drawMesh("cube",model(x,top+.18*scale,z,.065*scale,.23*scale,.065*scale),color,.75);
        drawMesh("cube",model(x,top+.27*scale,z,.21*scale,.052*scale,.065*scale),color,.75);
      }
      if(type==="q")for(let i=0;i<6;i++){const a=i*Math.PI/3,px=x+Math.cos(a)*.23*scale,pz=z+Math.sin(a)*.23*scale;
        drawMesh("cone",model(px,top+.13*scale,pz,.075*scale,.17*scale,.075*scale),color,.78);
        drawMesh("sphere",model(px,top+.31*scale,pz,.052*scale,.052*scale,.052*scale),color,.82);
      }
      if(type==="r")for(const [dx,dz] of[[-.25,-.22],[0,-.24],[.25,-.22],[-.25,.22],[0,.24],[.25,.22]])drawMesh("cube",model(x+dx*scale,top-.015*scale,z+dz*scale,.075*scale,.115*scale,.09*scale),color,.68);
      if(type==="n"){
        const direction=(dark?1:-1)*(data.flipped?-1:1),angle=direction*.38;
        drawMesh("sphere",modelRotX(x,lift+.82*scale,z+direction*.02*scale,.22*scale,.45*scale,.21*scale,angle),color,.68);
        drawMesh("sphere",modelRotX(x,lift+1.18*scale,z+direction*.26*scale,.24*scale,.25*scale,.33*scale,angle*.45),color,.74);
        drawMesh("sphere",modelRotX(x,lift+1.15*scale,z+direction*.49*scale,.18*scale,.13*scale,.27*scale,angle*.3),color,.7);
        for(const dx of[-.11,.11])drawMesh("cone",model(x+dx*scale,lift+1.48*scale,z+direction*.2*scale,.055*scale,.15*scale,.055*scale),color,.72);
        for(const dx of[-.205,.205])drawMesh("sphere",model(x+dx*scale,lift+1.29*scale,z+direction*.46*scale,.032*scale,.032*scale,.032*scale),[.018,.014,.012],.85);
      }
    }
    function render(){if(canvas.hidden||!data.board)return;resize();gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.clearColor(.075,.07,.06,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);gl.uniformMatrix4fv(uVP,false,vp);gl.uniform3fv(uEye,cameraEye);
      drawMesh("cube",model(0,-.22,0,4.55,.14,4.55),[.19,.12,.07]);
      for(let r=0;r<8;r++)for(let c=0;c<8;c++){const [x,z]=squarePosition(r,c),name="abcdefgh"[c]+(8-r);drawMesh("cube",model(x,-.055,z,.495,.055,.495),colorForSquare(name,r,c));}
      for(let r=0;r<8;r++)for(let c=0;c<8;c++){const piece=data.board[r][c],name="abcdefgh"[c]+(8-r);if(!piece||(drag?.movable&&drag.from===name))continue;const[x,z]=squarePosition(r,c);drawPiece(piece,x,z);}
      if(drag?.world){const[r,c]=drag.fromRC,piece=data.board[r][c];drawPiece(piece,drag.world[0],drag.world[2],.16,1.06);}
    }
    function worldAt(event){resize();const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)/rect.width*2-1,y=1-(event.clientY-rect.top)/rect.height*2;const a=transform(invVP,[x,y,-1,1]),b=transform(invVP,[x,y,1,1]);for(const q of[a,b]){q[0]/=q[3];q[1]/=q[3];q[2]/=q[3];}const t=(0-a[1])/(b[1]-a[1]);return[a[0]+(b[0]-a[0])*t,0,a[2]+(b[2]-a[2])*t];}
    function squareAt(event){const w=worldAt(event),vc=Math.floor(w[0]+4),vr=Math.floor(w[2]+4);if(vc<0||vc>7||vr<0||vr>7)return{square:null,world:w};const c=data.flipped?7-vc:vc,r=data.flipped?7-vr:vr;return{square:"abcdefgh"[c]+(8-r),world:w,r,c};}
    canvas.addEventListener("pointerdown",(e)=>{const hit=squareAt(e),forcedOrbit=e.button!==0||!hit.square;e.preventDefault();canvas.setPointerCapture(e.pointerId);drag={from:hit.square,fromRC:hit.square?[hit.r,hit.c]:null,start:[e.clientX,e.clientY],startAngle:cameraAngle,startPitch:cameraPitch,world:null,orbit:false,suppressClick:e.button!==0,movable:!forcedOrbit&&data.movable.has(hit.square)};if(drag.movable)callbacks.onDragStart?.(hit.square);});
    canvas.addEventListener("pointermove",(e)=>{if(!drag)return;const dx=e.clientX-drag.start[0],dy=e.clientY-drag.start[1];if(Math.hypot(dx,dy)<=5)return;if(drag.movable){drag.world=worldAt(e);canvas.classList.add("dragging");}else{drag.orbit=true;cameraAngle=drag.startAngle-dx*.009;cameraPitch=Math.max(.22,Math.min(1.2,drag.startPitch+dy*.007));canvas.classList.add("rotating");}render();});
    canvas.addEventListener("pointerup",(e)=>{if(!drag)return;const active=drag,hit=squareAt(e);drag=null;canvas.classList.remove("dragging","rotating");if(active.orbit||active.suppressClick){render();return;}if(active.world&&active.movable&&hit.square&&hit.square!==active.from)callbacks.onDrop?.(active.from,hit.square);else if(hit.square)callbacks.onSquare?.(hit.square);render();});
    canvas.addEventListener("pointercancel",()=>{drag=null;canvas.classList.remove("dragging","rotating");render();});
    canvas.addEventListener("contextmenu",(e)=>e.preventDefault());
    new ResizeObserver(render).observe(canvas);
    return { available:true, update(next){data=next;render();}, rotate(){cameraAngle=(cameraAngle+Math.PI/2)%(Math.PI*2);render();}, render };
  }
  root.Chess3DView={create};
})(typeof window!=="undefined"?window:globalThis);
