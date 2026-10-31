import { database } from "./mongo";
import { listCompanions } from "./companions";
export function monthRange(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("月份格式应为 YYYY-MM");
  const [year,m]=month.split("-").map(Number);
  return { from: `${month}-01`, to: `${m===12?year+1:year}-${String(m===12?1:m+1).padStart(2,"0")}-01` };
}
export function halfMonthRange(month: string, half: "1" | "2") {
  const range = monthRange(month);
  return half === "1"
    ? { from: `${month}-01`, to: `${month}-16` }
    : { from: `${month}-16`, to: range.to };
}
export async function companionDashboard(q: string, month: string) {
  const {from,to}=monthRange(month);
  const firstHalf=halfMonthRange(month,"1");
  const secondHalf=halfMonthRange(month,"2");
  const people=await listCompanions(); const db=await database();
  const inMonth={ $and:[{$gte:["$date",from]},{$lt:["$date",to]}] };
  const inFirstHalf={ $and:[{$gte:["$date",firstHalf.from]},{$lt:["$date",firstHalf.to]}] };
  const inSecondHalf={ $and:[{$gte:["$date",secondHalf.from]},{$lt:["$date",secondHalf.to]}] };
  const totals=await db.collection("orders").aggregate([
    {$match:{companionId:{$in:people.map(p=>p._id.toString())}}},
    {$group:{_id:"$companionId",allCount:{$sum:{$cond:[{$eq:["$type","L"]},0,{$multiply:[{$ifNull:["$quantity",0]},2]}]}},allEarnings:{$sum:"$wage"},monthCount:{$sum:{$cond:[inMonth,{$cond:[{$eq:["$type","L"]},0,{$multiply:[{$ifNull:["$quantity",0]},2]}]},0]}},monthEarnings:{$sum:{$cond:[inMonth,"$wage",0]}},firstHalfCount:{$sum:{$cond:[inFirstHalf,{$cond:[{$eq:["$type","L"]},0,{$multiply:[{$ifNull:["$quantity",0]},2]}]},0]}},firstHalfEarnings:{$sum:{$cond:[inFirstHalf,"$wage",0]}},secondHalfCount:{$sum:{$cond:[inSecondHalf,{$cond:[{$eq:["$type","L"]},0,{$multiply:[{$ifNull:["$quantity",0]},2]}]},0]}},secondHalfEarnings:{$sum:{$cond:[inSecondHalf,"$wage",0]}}}},
    {$project:{allCount:1,monthCount:1,firstHalfCount:1,secondHalfCount:1,allEarnings:{$round:["$allEarnings",2]},monthEarnings:{$round:["$monthEarnings",2]},firstHalfEarnings:{$round:["$firstHalfEarnings",2]},secondHalfEarnings:{$round:["$secondHalfEarnings",2]}}}
  ]).toArray();
  const byId=new Map(totals.map(t=>[t._id,t]));
  const items=people.map(p=>{const s=byId.get(p._id.toString());return {...p,name:String(p.name),notes:String(p.notes||""),monthCount:Number(s?.monthCount||0),monthEarnings:Number(s?.monthEarnings||0),firstHalfCount:Number(s?.firstHalfCount||0),firstHalfEarnings:Number(s?.firstHalfEarnings||0),secondHalfCount:Number(s?.secondHalfCount||0),secondHalfEarnings:Number(s?.secondHalfEarnings||0),allCount:Number(s?.allCount||0),allEarnings:Number(s?.allEarnings||0)};});
  const rank=(count:"monthCount"|"firstHalfCount"|"secondHalfCount"|"allCount",earnings:"monthEarnings"|"firstHalfEarnings"|"secondHalfEarnings"|"allEarnings")=>[...items].filter(p=>p[count]>0||p[earnings]>0).sort((a,b)=>b[count]-a[count]||b[earnings]-a[earnings]||a.name.localeCompare(b.name,"zh-CN")).map((p,i)=>({id:p._id.toString(),name:p.name,count:p[count],earnings:p[earnings],rank:i+1}));
  const query=q.trim().toLocaleLowerCase();
  return {items:items.filter(p=>!query||p.name.toLocaleLowerCase().includes(query)||p.notes.toLocaleLowerCase().includes(query)),month,leaderboard:{monthly:rank("monthCount","monthEarnings"),firstHalf:rank("firstHalfCount","firstHalfEarnings"),secondHalf:rank("secondHalfCount","secondHalfEarnings"),allTime:rank("allCount","allEarnings")}};
}
