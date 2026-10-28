import {questions,chapters,byId} from './content.mjs';
export const STORAGE_KEY='scripture-trails-v1';
export const freshState=()=>({version:1,records:{},active:null,route:'bible'});
export const points=hints=>100-20*(Math.max(1,Math.min(3,hints))-1);
export function normaliseState(input){
  if(!input||input.version!==1)throw new Error('Это не файл прогресса этой версии игры.');
  const state=freshState();state.route=input.route==='history'?'history':'bible';
  for(const q of questions){
    const r=input.records?.[q.id];if(!r||typeof r!=='object')continue;
    state.records[q.id]={seen:r.seen===true,best:Number.isFinite(r.best)?Math.max(0,Math.min(100,Math.floor(r.best))):0,lastCorrect:r.lastCorrect===true,bookmarked:r.bookmarked===true};
    if(!state.records[q.id].seen)state.records[q.id].best=0;
  }
  const a=input.active;
  if(a&&['chapter','daily','review'].includes(a.mode)&&Array.isArray(a.ids)&&a.ids.length>0&&a.ids.length<=32&&new Set(a.ids).size===a.ids.length&&a.ids.every(id=>!!byId[id])&&Number.isInteger(a.index)&&a.index>=0&&a.index<a.ids.length&&Number.isInteger(a.hints)&&a.hints>=1&&a.hints<=3&&Array.isArray(a.results)){
    const validResults=a.results.every((r,i)=>r.id===a.ids[i]&&Number.isInteger(r.choice)&&r.choice>=-1&&r.choice<4&&Number.isInteger(r.hints)&&r.hints>=1&&r.hints<=3);
    const validChapter=a.mode!=='chapter'||chapters.some(c=>c.id===a.chapter&&questions.filter(q=>q.chapter===c.id).map(q=>q.id).join()===a.ids.join());
    if(validResults&&validChapter&&a.results.length===a.index+(a.selected===null?0:1)&&(a.selected===null||a.selected===a.results.at(-1)?.choice))state.active={mode:a.mode,chapter:a.mode==='chapter'?a.chapter:null,ids:[...a.ids],index:a.index,hints:a.hints,selected:a.selected,results:a.results.map(r=>({id:r.id,choice:r.choice,hints:r.hints}))};
  }
  return state;
}
export const chapterQuestions=id=>questions.filter(q=>q.chapter===id);
export const chapterDone=(state,id)=>chapterQuestions(id).every(q=>state.records[q.id]?.seen);
export function chapterUnlocked(state,id){const c=chapters.find(x=>x.id===id);if(!c)return false;const route=chapters.filter(x=>x.route===c.route);const i=route.indexOf(c);return i===0||chapterDone(state,route[i-1].id);}
export const totalScore=state=>Object.values(state.records).reduce((sum,r)=>sum+r.best,0);
export const seenCount=state=>Object.values(state.records).filter(r=>r.seen).length;
export const mistakes=state=>questions.filter(q=>state.records[q.id]?.seen&&!state.records[q.id].lastCorrect);
export function answer(state,choice){
  if(!Number.isInteger(choice)||choice<0||choice>3)return false;
  return recordChoice(state,choice);
}
// -1 means that the answer was revealed without choosing an option.
export function skip(state){return recordChoice(state,-1);}
function recordChoice(state,choice){
  const a=state.active;if(!a||a.selected!==null)return false;
  const q=byId[a.ids[a.index]],correct=q.correct===choice;
  const old=state.records[q.id]||{best:0,bookmarked:false};
  state.records[q.id]={seen:true,best:Math.max(old.best,correct?points(a.hints):0),lastCorrect:correct,bookmarked:old.bookmarked};
  a.selected=choice;a.results.push({id:q.id,choice,hints:a.hints});return true;
}
export function dayKey(date=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
export function dailyQuestions(key=dayKey()){
  let seed=[...key].reduce((s,c)=>(s*31+c.charCodeAt(0))>>>0,2166136261);
  const shuffled=[...questions];for(let i=shuffled.length-1;i>0;i--){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const j=seed%(i+1);[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
  return shuffled.slice(0,5).map(q=>q.id);
}
