import pkg from './package.json' with {type:'json'};
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,sep} from 'node:path';
import {getTask} from './public/tasks.js';
import {assess} from './safety.js';
import {runVisionChecks,validateDetections,decideReminder,runAgenticVideo} from './vision.js';
const root=fileURLToPath(new URL('./public/',import.meta.url));
const key=process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY;
const model=process.env.GEMINI_MODEL||'gemini-2.5-flash';
const videoModel=process.env.GEMINI_VIDEO_MODEL||'gemini-3.8-flash';
const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
async function remote(url,options={}){const response=await fetch(url,{...options,signal:AbortSignal.timeout(25000)});if(!response.ok)throw Error(`Upstream request failed (${response.status})`);return response.json();}
export const server=http.createServer(async(req,res)=>{
 try{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/api/status')return send(res,200,{version:pkg.version,visionConfigured:!!key,model,videoModel});
 if(url.pathname==='/api/weather'){
 const lat=Number(url.searchParams.get('lat')),lon=Number(url.searchParams.get('lon'));
 if(!url.searchParams.has('lat')||!url.searchParams.has('lon')||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return send(res,400,{error:'Enter valid latitude and longitude.'});
 const headers={'User-Agent':'SiteySensePrototype/0.1','Accept':'application/geo+json'};
 const point=await remote(`https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`,{headers});
 const forecast=await remote(point.properties.forecastHourly,{headers});
 const p=forecast.properties.periods[0];
 return send(res,200,{temperature:p.temperatureUnit==='C'?p.temperature*9/5+32:p.temperature,wind:parseInt(p.windSpeed)||0,summary:p.shortForecast,humidity:p.relativeHumidity?.value,updated:forecast.properties.updateTime,period:p.startTime,source:'National Weather Service hourly forecast',url:point.properties.forecastHourly});
 }
 if(req.method==='POST'&&(url.pathname==='/api/analyze'||url.pathname==='/api/analyze-video'||url.pathname==='/api/briefing')){
 let body='';for await(const chunk of req){body+=chunk;if(body.length>(url.pathname==='/api/analyze-video'?22_000_000:12_000_000))return send(res,413,{error:'Use a smaller image or video sample.'});}
 let data;try{data=JSON.parse(body);}catch{return send(res,400,{error:'Invalid JSON.'});}
 if(!data||typeof data!=='object'||Array.isArray(data))return send(res,400,{error:'Send a JSON object.'});
 if(url.pathname==='/api/briefing'){
 if((data.task!==undefined&&!getTask(data.task))||['temperature','wind'].some(k=>data[k]!==undefined&&(!Number.isFinite(data[k])||data[k]<(k==='wind'?0:-100)||data[k]>(k==='wind'?300:160)))||(data.rain!==undefined&&typeof data.rain!=='boolean')||(data.observations!==undefined&&(!Array.isArray(data.observations)||data.observations.some(o=>!o||!['edge','ladder','ppe'].includes(o.category)))))return send(res,400,{error:'Invalid task, conditions, or observations.'});
 if(data.detections!==undefined){try{data.detections=validateDetections(data.detections);}catch{return send(res,400,{error:'Invalid structured vision detections.'});}}
 return send(res,200,assess(data));
 }
 if(!key)return send(res,503,{error:'Vision is not configured. Set GEMINI_API_KEY on the server or use the labeled demo scenario.'});
 if(url.pathname==='/api/analyze-video'){
 const video=data.video;
 if(!video||!['video/mp4','video/webm'].includes(video.mimeType)||!Number.isFinite(video.duration)||video.duration<=0||video.duration>30||typeof video.data!=='string'||video.data.length>20_000_000||(video.data.length%4!==0||!/^[A-Za-z0-9+/]+={0,2}$/.test(video.data))||video.data.length===0)return send(res,400,{error:'Send an MP4 or WebM clip up to 30 seconds and 14 MB.'});
 const output=await runAgenticVideo(video,{apiKey:key,model:videoModel});
 const observations=output.detections.flatMap(decideReminder);
 const quality=output.detections.every(f=>f.quality==='insufficient')?'insufficient':'usable';
 return send(res,200,{...output,observations,quality,mode:'model',reason:quality==='insufficient'?'No usable view was available.':'Review completed for selected moments only.'});
 }
 if(!Array.isArray(data.frames)||data.frames.length<1||data.frames.length>4||data.frames.some(f=>!f||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(f.image)||!Number.isFinite(f.time)))return send(res,400,{error:'Send 1–4 JPEG frames with timestamps.'});
 const detections=await runVisionChecks(data.frames,{apiKey:key,model});
 const observations=detections.flatMap(decideReminder);
 const quality=detections.every(frame=>frame.quality==='insufficient')?'insufficient':'usable';
 return send(res,200,{detections,observations,quality,reason:quality==='insufficient'?'The supplied views are not clear enough for visual assessment.':'Structured visual checks completed; uncertain views require worker verification.',mode:'model',model});
 }
 if(req.method!=='GET')return send(res,405,{error:'Method not allowed'});
 const path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
 if(!path.startsWith(root.endsWith(sep)?root:root+sep))return send(res,403,{error:'Forbidden'});
 const content=await readFile(path);
 const extension=path.split('.').pop();const mime={css:'text/css',js:'text/javascript',html:'text/html',webmanifest:'application/manifest+json',png:'image/png',svg:'image/svg+xml'}[extension]||'application/octet-stream';
 res.writeHead(200,{'Content-Type':mime,'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache',...(url.pathname==='/sw.js'?{'Service-Worker-Allowed':'/'}:{})});res.end(content);
 }catch(error){send(res,error.code==='ENOENT'?404:502,{error:error.code==='ENOENT'?'Not found':error.message});}
});
if(process.argv[1]===fileURLToPath(import.meta.url))server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('SiteySense running on port '+(process.env.PORT||3000)));
