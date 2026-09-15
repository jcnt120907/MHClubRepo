import { database } from "./mongo";
import { listCompanions } from "./companions";
export function monthRange(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("月份格式应为 YYYY-MM");
  const [year,m]=month.split("-").map(Number);
  return { from: `${month}-01`, to: `${m===12?year+1:year}-${String(m===12?1:m+1).padStart(2,"0")}-01` };
}
export async function companionDashboard(q: string, month: string) {
  const {from,to}=monthRange(month);
  const people=await listCompanions(); const db=await database();
  const inMonth={ $and:[{$gte:["$date",from]},{$lt:["$date",to]}] };
  const totals=await db.collection("orders").aggregate([
    {$match:{companionId:{$in:people.map(p=>p._id.toString())}}},
    {$group:{_id:"$companionId",allCount:{$sum:1},allEarnings:{$sum:"$wage"},monthCount:{$sum:{$cond:[inMonth,1,0]}},monthEarnings:{$sum:{$cond:[inMonth,"$wage",0]}}}},
    {$project:{allCount:1,monthCount:1,allEarnings:{$round:["$allEarnings",2]},monthEarnings:{$round:["$monthEarnings",2]}}}
  ]).toArray();
  const byId=new Map(totals.map(t=>[t._id,t]));
  const items=people.map(p=>{const s=byId.get(p._id.toString());return {...p,name:String(p.name),notes:String(p.notes||""),monthCount:Number(s?.monthCount||0),monthEarnings:Number(s?.monthEarnings||0),allCount:Number(s?.allCount||0),allEarnings:Number(s?.allEarnings||0)};});
  const rank=(count:"monthCount"|"allCount",earnings:"monthEarnings"|"allEarnings")=>[...items].filter(p=>p[count]>0).sort((a,b)=>b[count]-a[count]||b[earnings]-a[earnings]||a.name.localeCompare(b.name,"zh-CN")).map((p,i)=>({id:p._id.toString(),name:p.name,count:p[count],earnings:p[earnings],rank:i+1}));
  const query=q.trim().toLocaleLowerCase();
  return {items:items.filter(p=>!query||p.name.toLocaleLowerCase().includes(query)||p.notes.toLocaleLowerCase().includes(query)),month,leaderboard:{monthly:rank("monthCount","monthEarnings"),allTime:rank("allCount","allEarnings")}};
}
