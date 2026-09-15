import assert from "node:assert/strict";
import { ObjectId } from "mongodb";
import { createCompanion, updateCompanion } from "../lib/companions";
import { companionDashboard, monthRange } from "../lib/companion-stats";
import { createOrder, database } from "../lib/db";
import rows from "../data/september.json";
export async function statsChecks() {
 assert.deepEqual(monthRange("2030-12"),{from:"2030-12-01",to:"2031-01-01"});
 assert.throws(()=>monthRange("2030-13"));
 const a=await createCompanion({name:"统计甲",notes:""}),b=await createCompanion({name:"统计乙",notes:""});
 await createCompanion({name:"统计零",notes:""});
 for(const date of ["2030-08-31","2030-09-01","2030-09-30"]) await createOrder({...rows[0],companionId:a._id,companion:a.name,date});
 for(const date of ["2030-08-31","2030-08-30","2030-09-01","2030-10-01"]) await createOrder({...rows[0],companionId:b._id,companion:b.name,date,type:"L",service:"礼物",unitPrice:0,quantity:0,addons:[],gift:10});
 let d=await companionDashboard("统计","2030-09");
 const aa=d.items.find(p=>p.name==="统计甲")!,bb=d.items.find(p=>p.name==="统计乙")!;
 assert.equal(aa.monthCount,2);assert.equal(aa.allCount,3);assert.equal(aa.monthEarnings,30);assert.equal(aa.allEarnings,45);
 assert.equal(bb.monthCount,1);assert.equal(bb.allCount,4);assert.equal(bb.monthEarnings,8);assert.equal(bb.allEarnings,32);
 assert.equal(d.items.find(p=>p.name==="统计零")!.allCount,0);
 assert.equal(d.leaderboard.monthly[0].name,"统计甲");
 assert.ok(d.leaderboard.allTime.find(p=>p.name==="统计乙")!.rank<d.leaderboard.allTime.find(p=>p.name==="统计甲")!.rank);
 await updateCompanion(a._id,{name:"统计改名",notes:""});
 d=await companionDashboard("统计改名","2030-09");
 assert.equal(d.items.length,1);assert.equal(d.items[0].allCount,3);assert.equal(d.leaderboard.monthly.length,2);
 const db=await database();
 await db.collection("orders").deleteOne({companionId:a._id,date:"2030-09-01"});
 assert.equal((await companionDashboard("统计改名","2030-09")).items[0].monthCount,1);
 assert.equal((await companionDashboard("统计","2031-01")).leaderboard.monthly.length,0);
 console.log("Statistics passed: monthly boundaries, lifetime totals, gifts, zero orders, ranking, search independence, rename and deletion.");
}
