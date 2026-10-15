const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const power = document.getElementById('power');
const powerLabel = document.getElementById('powerLabel');
const shootBtn = document.getElementById('shoot');
const statusText = document.getElementById('status');
const feedback = document.getElementById('feedback');
const hint = document.getElementById('hint');
const flash = document.getElementById('flash');

const W = canvas.width, H = canvas.height;
const goal = { x: 255, y: 90, w: 490, h: 205 };
let target = {x: 500, y: 175};
let shot = null, keeper = {x:500,y:225}, animating = false, finished = false;
let goals = 0, saves = 0, attempts = 0, streak = 0, bestStreak = 0;
let particles = [], messageTimer = null;

function draw(){
  ctx.clearRect(0,0,W,H);
  // Stadium atmosphere
  const sky = ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,'#122d3a'); sky.addColorStop(.55,'#1a5145'); sky.addColorStop(1,'#0d302c');
  ctx.fillStyle=sky; ctx.fillRect(0,0,W,H);
  // Stadium lights and stands
  for(let side=0;side<2;side++){
    const x=side===0?0:820;
    ctx.fillStyle='#122631'; ctx.fillRect(x,0,180,155);
    for(let r=0;r<4;r++) for(let c=0;c<11;c++){
      ctx.fillStyle=['#8da5ad','#d4b98a','#547c91','#e4e7d9'][(r*3+c*7)%4];
      ctx.globalAlpha=.23+((r+c)%3)*.08;
      ctx.fillRect(x+8+c*14,18+r*26,7,11);
    }
  }
  ctx.globalAlpha=1;
  // Floodlight glow
  for(const x of [90,910]){
    const g=ctx.createRadialGradient(x,28,5,x,28,130);g.addColorStop(0,'#d7f5e533');g.addColorStop(1,'#d7f5e500');ctx.fillStyle=g;ctx.fillRect(x-130,0,260,170);
  }
  // Pitch
  ctx.fillStyle='#237052';ctx.beginPath();ctx.moveTo(120,190);ctx.lineTo(880,190);ctx.lineTo(1040,560);ctx.lineTo(-40,560);ctx.closePath();ctx.fill();
  for(let i=0;i<8;i++){
    ctx.fillStyle=i%2?'#2b8059':'#247451';
    ctx.beginPath();ctx.moveTo(120+i*95,190);ctx.lineTo(215+i*95,190);ctx.lineTo(270+i*100,560);ctx.lineTo(140+i*100,560);ctx.closePath();ctx.fill();
  }
  ctx.strokeStyle='#d9f1dd';ctx.globalAlpha=.36;ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(120,190);ctx.lineTo(880,190);ctx.lineTo(1040,560);ctx.lineTo(-40,560);ctx.closePath();ctx.stroke();
  // penalty box
  ctx.beginPath();ctx.moveTo(205,225);ctx.lineTo(795,225);ctx.lineTo(900,500);ctx.lineTo(100,500);ctx.closePath();ctx.stroke();
  ctx.beginPath();ctx.ellipse(500,485,115,40,0,Math.PI,Math.PI*2);ctx.stroke();
  // Goal shadow and frame
  ctx.fillStyle='#071a18';ctx.globalAlpha=.25;ctx.beginPath();ctx.ellipse(500,301,280,24,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  ctx.fillStyle='#dce9e9';ctx.fillRect(goal.x-6,goal.y-8,goal.w+12,9);
  ctx.fillRect(goal.x-6,goal.y-8,9,goal.h+10);ctx.fillRect(goal.x+goal.w-3,goal.y-8,9,goal.h+10);
  // net perspective
  ctx.fillStyle='#d7e2df';ctx.globalAlpha=.12;ctx.fillRect(goal.x,goal.y,goal.w,goal.h);ctx.globalAlpha=1;
  ctx.strokeStyle='#dbe7e6';ctx.lineWidth=1;ctx.globalAlpha=.3;
  for(let x=goal.x+15;x<goal.x+goal.w;x+=22){ctx.beginPath();ctx.moveTo(x,goal.y);ctx.lineTo(x,goal.y+goal.h);ctx.stroke();}
  for(let y=goal.y+12;y<goal.y+goal.h;y+=19){ctx.beginPath();ctx.moveTo(goal.x,y);ctx.lineTo(goal.x+goal.w,y);ctx.stroke();}
  ctx.globalAlpha=1;
  // goalkeeper
  drawKeeper(keeper.x,keeper.y);
  // ball spot and aiming reticle
  if(!animating && !finished){
    ctx.strokeStyle='#c6f45b';ctx.lineWidth=3;ctx.setLineDash([7,6]);
    ctx.beginPath();ctx.moveTo(500,530);ctx.lineTo(target.x,target.y);ctx.stroke();ctx.setLineDash([]);
    ctx.beginPath();ctx.arc(target.x,target.y,15,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(target.x-23,target.y);ctx.lineTo(target.x-8,target.y);ctx.moveTo(target.x+8,target.y);ctx.lineTo(target.x+23,target.y);ctx.moveTo(target.x,target.y-23);ctx.lineTo(target.x,target.y-8);ctx.moveTo(target.x,target.y+8);ctx.lineTo(target.x,target.y+23);ctx.stroke();
  }
  // Ball
  if(shot && shot.ball){drawBall(shot.ball.x,shot.ball.y,shot.ball.r||13);}
  else drawBall(500,530,13);
  // particles
  particles.forEach(p=>{ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;
  // labels
  ctx.fillStyle='#f4fff5';ctx.font='800 11px Inter, sans-serif';ctx.textAlign='center';ctx.fillText('PORTERÍA',500,68);
  ctx.fillStyle='#d9f4df';ctx.globalAlpha=.8;ctx.font='800 10px Inter, sans-serif';ctx.fillText('PUNTO DE PENAL',500,550);ctx.globalAlpha=1;
}
function drawKeeper(x,y){
  // body shadow
  ctx.fillStyle='#09201b';ctx.globalAlpha=.35;ctx.beginPath();ctx.ellipse(x,y+58,60,12,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
  // arms
  ctx.strokeStyle='#f0a27d';ctx.lineWidth=17;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(x-18,y+4);ctx.lineTo(x-47,y+19);ctx.lineTo(x-62,y+4);ctx.moveTo(x+18,y+4);ctx.lineTo(x+47,y+19);ctx.lineTo(x+62,y+4);ctx.stroke();
  // gloves
  ctx.fillStyle='#c6f45b';for(const s of [-1,1]){ctx.beginPath();ctx.arc(x+s*63,y+2,11,0,Math.PI*2);ctx.fill();}
  // legs
  ctx.strokeStyle='#172c53';ctx.lineWidth=18;ctx.beginPath();ctx.moveTo(x-11,y+35);ctx.lineTo(x-22,y+58);ctx.moveTo(x+11,y+35);ctx.lineTo(x+22,y+58);ctx.stroke();
  ctx.strokeStyle='#e9f0f0';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(x-22,y+58);ctx.lineTo(x-34,y+58);ctx.moveTo(x+22,y+58);ctx.lineTo(x+34,y+58);ctx.stroke();
  // jersey
  ctx.fillStyle='#e8f0e8';ctx.beginPath();ctx.moveTo(x-20,y-12);ctx.lineTo(x+20,y-12);ctx.lineTo(x+27,y+35);ctx.lineTo(x-27,y+35);ctx.closePath();ctx.fill();
  ctx.fillStyle='#e9584e';ctx.fillRect(x-20,y-12,40,9);
  ctx.fillStyle='#213b49';ctx.fillRect(x-4,y+2,8,15);
  // neck/head
  ctx.fillStyle='#d99b78';ctx.fillRect(x-7,y-23,14,14);ctx.beginPath();ctx.arc(x,y-31,16,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#392c26';ctx.beginPath();ctx.arc(x,y-36,16,Math.PI,Math.PI*2);ctx.fill();ctx.fillRect(x-16,y-37,32,5);
}
function drawBall(x,y,r){
  ctx.fillStyle='#07181455';ctx.beginPath();ctx.ellipse(x+3,y+r*.9,r*1.1,r*.45,0,0,Math.PI*2);ctx.fill();
  const g=ctx.createRadialGradient(x-r*.35,y-r*.4,2,x,y,r);g.addColorStop(0,'#ffffff');g.addColorStop(1,'#b9c5c5');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#1b2b30';
  for(const [dx,dy] of [[0,0],[-.55,-.25],[.55,-.25],[-.35,.55],[.45,.5]]){ctx.beginPath();ctx.arc(x+dx*r,y+dy*r,r*.22,0,Math.PI*2);ctx.fill();}
}
function renderLoop(){
  if(animating && shot){
    shot.t += 0.035 + Number(power.value)/6000;
    const t=Math.min(1,shot.t), ease=t*t*(3-2*t);
    shot.ball.x=500+(shot.tx-500)*ease;
    shot.ball.y=530+(shot.ty-530)*ease;
    shot.ball.r=13-5*ease;
    keeper.x=shot.kx; keeper.y=shot.ky;
    if(t>=1){resolveShot();}
  }
  particles=particles.filter(p=>p.life>0);
  particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.life-=.025;p.vy+=.08;});
  draw();requestAnimationFrame(renderLoop);
}
function chooseTarget(e){
  if(animating||finished)return;
  const rect=canvas.getBoundingClientRect();
  const x=(e.clientX-rect.left)/rect.width*W;
  const y=(e.clientY-rect.top)/rect.height*H;
  if(x>=goal.x-10&&x<=goal.x+goal.w+10&&y>=goal.y-10&&y<=goal.y+goal.h+10){
    target.x=Math.max(goal.x+12,Math.min(goal.x+goal.w-12,x));
    target.y=Math.max(goal.y+12,Math.min(goal.y+goal.h-12,y));
    hint.style.opacity='0';
    feedback.className='feedback';feedback.textContent=`Objetivo fijado. Potencia al ${power.value}%. ¡A por el gol!`;
  }
}
canvas.addEventListener('pointerdown',chooseTarget);
power.addEventListener('input',()=>{powerLabel.textContent=power.value+'%';});
shootBtn.addEventListener('click',shoot);
function shoot(){
  if(animating)return;
  if(finished){resetGame();return;}
  animating=true;shootBtn.disabled=true;hint.style.opacity='0';
  attempts++;
  statusText.textContent='DISPARO EN CURSO…';
  document.getElementById('round').textContent=`DISPARO ${attempts} / 5`;
  const p=Number(power.value)/100;
  // More power creates more speed but slightly less precision; keeper reads the target imperfectly.
  const accuracyError=(Math.random()-.5)*(1-p)*95;
  const tx=Math.max(goal.x-35,Math.min(goal.x+goal.w+35,target.x+accuracyError));
  const ty=Math.max(goal.y-20,Math.min(goal.y+goal.h+30,target.y+(Math.random()-.5)*(1-p)*30));
  const keeperGuess=Math.random();
  let kx=keeperGuess<.25?365+Math.random()*40:keeperGuess<.5?595+Math.random()*40:target.x+(Math.random()-.5)*100;
  kx=Math.max(300,Math.min(700,kx));
  // Keeper reacts to some shots; powerful shots are harder to stop.
  const dives=Math.random()<(0.58-p*.23);
  if(!dives)kx=500+(Math.random()-.5)*45;
  keeper={x:500,y:225};
  shot={t:0,tx,ty,ball:{x:500,y:530,r:13},kx,ky:dives?190:225,goal:tx>=goal.x+8&&tx<=goal.x+goal.w-8&&ty>=goal.y+8&&ty<=goal.y+goal.h-8};
  feedback.className='feedback';feedback.textContent='¡Disparo!';draw();
}
function resolveShot(){
  animating=false;
  const close=Math.abs(shot.tx-shot.kx)<62 && Math.abs(shot.ty-190)<70;
  const goalScored=shot.goal&&!close;
  if(goalScored){
    goals++;streak++;bestStreak=Math.max(bestStreak,streak);
    statusText.textContent='¡GOOOOOOL!';feedback.className='feedback good';feedback.textContent=shot.tx<410?'¡A la escuadra! Un disparo espectacular.':shot.tx>590?'¡Imparable! La pusiste junto al poste.':'¡GOOOOL! El portero no pudo hacer nada.';
    burst(shot.tx,shot.ty,'#c6f45b');flash.classList.remove('play');void flash.offsetWidth;flash.classList.add('play');
  }else{
    saves++;streak=0;
    if(!shot.goal){statusText.textContent='¡AFUERA!';feedback.textContent='Se fue por poco. Ajusta la puntería y vuelve a intentarlo.';}
    else{statusText.textContent='¡ATAJADÓN!';feedback.textContent='El portero adivinó tu intención. Cambia de esquina.';}
    feedback.className='feedback bad';burst(shot.tx,shot.ty,shot.goal?'#ff8275':'#dce9e9');
  }
  document.getElementById('goals').textContent=goals;
  document.getElementById('saves').textContent=saves;
  document.getElementById('accuracy').textContent=Math.round(goals/attempts*100)+'%';
  document.getElementById('streak').textContent=bestStreak;
  document.getElementById('remaining').textContent=Math.max(0,5-attempts);
  shot=null;keeper={x:500,y:225};
  if(attempts>=5){
    finished=true;shootBtn.disabled=false;shootBtn.innerHTML='<span>JUGAR DE NUEVO</span><span class="arrow">↻</span>';
    statusText.textContent=goals>saves?'¡ERES EL CAMPEÓN!':goals===saves?'¡EMPATE!':'FIN DE LA TANDA';
    feedback.className=goals>=3?'feedback good':'feedback';
    feedback.textContent=`Tanda terminada: ${goals} goles y ${saves} atajadas. ${goals>=3?'¡Gran definición!':'¿Listo para la revancha?'}`;
  }else{
    shootBtn.disabled=false;shootBtn.innerHTML='<span>DISPARAR</span><span class="arrow">↗</span>';
    document.getElementById('round').textContent=`DISPARO ${attempts+1} / 5`;
    setTimeout(()=>{if(!finished){statusText.textContent='TU TURNO • ELIGE DÓNDE DISPARAR';target={x:500,y:175};hint.style.opacity='1';}},850);
  }
}
function burst(x,y,color){for(let i=0;i<24;i++){const a=Math.random()*Math.PI*2,s=1+Math.random()*5;particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-1,life:.8+Math.random()*.2,r:2+Math.random()*3,color});}}
function resetGame(){
  goals=0;saves=0;attempts=0;streak=0;bestStreak=0;finished=false;animating=false;shot=null;keeper={x:500,y:225};target={x:500,y:175};particles=[];
  document.getElementById('goals').textContent='0';document.getElementById('saves').textContent='0';document.getElementById('accuracy').textContent='—';document.getElementById('streak').textContent='0';document.getElementById('remaining').textContent='5';
  document.getElementById('round').textContent='DISPARO 1 / 5';statusText.textContent='TU TURNO • ELIGE DÓNDE DISPARAR';feedback.className='feedback';feedback.textContent='Selecciona un punto dentro de la portería para preparar tu tiro.';
  shootBtn.innerHTML='<span>DISPARAR</span><span class="arrow">↗</span>';shootBtn.disabled=false;hint.style.opacity='1';
}
draw();renderLoop();