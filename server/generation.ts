export function verifiedQuestion(raw:any, bank:any, type:number){
 const sources=[bank,...(bank.crossSources||[])];
 const verses=sources.flatMap((s:any)=>(s.verseData?.zh||[]).map((v:any,i:number)=>({id:v.reference,zh:v.text,en:s.verseData?.en?.[i]?.reference===v.reference?s.verseData.en[i].text:null,urls:s.sourceUrls}))).filter((v:any)=>v.en);
 const ids=raw.verseIds;
 if(!Array.isArray(ids)||!ids.length||ids.some((id:any)=>typeof id!=='string'))throw Error('unverified_reference');
 const selected=ids.map((id:string)=>verses.find((v:any)=>v.id===id));
 if(selected.some((v:any)=>!v)||new Set(ids).size!==ids.length)throw Error('unverified_reference');
 if(type===4&&selected.length>2)throw Error('invalid_recitation');
 const crossIds=raw.crossVerseIds||[];
 if(!Array.isArray(crossIds)||crossIds.some((id:any)=>!verses.some((v:any)=>v.id===id)))throw Error('unverified_reference');
 if(type===3&&!crossIds.length)throw Error('cross_reference_required');
 return {...raw,reference:ids.join('; '),crossReferences:crossIds,scripture:{zh:selected.map((v:any)=>v.zh).join(' '),en:selected.map((v:any)=>v.en).join(' ')},sourceUrls:[...new Set([...selected,...crossIds.map((id:string)=>verses.find((v:any)=>v.id===id))].flatMap((v:any)=>v.urls))]};
}
export function generationSources(bank:any){return [bank,...(bank.crossSources||[])].map(s=>({reference:s.reference,verses:(s.verseData?.zh||[]).map((v:any,i:number)=>({id:v.reference,zh:v.text,en:s.verseData?.en?.[i]?.text}))}));}

export function generationFormat(bank:any,type:number){
 const ids=generationSources(bank).flatMap(s=>s.verses.map((v:any)=>v.id));
 const text={type:'object',properties:{zh:{type:'string'},en:{type:'string'}},required:['zh','en'],additionalProperties:false};
 const properties:any={prompt:text,answer:text,explanation:text,rubric:text,verseIds:{type:'array',items:{type:'string',enum:ids},minItems:1,...(type===4?{maxItems:2}:{})},crossVerseIds:{type:'array',items:{type:'string',enum:ids},...(type===3?{minItems:1}:{})}};
 if(type<=2)properties.options={type:'array',items:text,minItems:4,maxItems:4};
 return {type:'json_schema' as const,name:'bible_questions',strict:true,schema:{type:'object',properties:{questions:{type:'array',items:{type:'object',properties,required:Object.keys(properties),additionalProperties:false}}},required:['questions'],additionalProperties:false}};
}
