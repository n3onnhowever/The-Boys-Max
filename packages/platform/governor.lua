-- One atomic Redis state per credential. Initialization is an explicit operator action; no auto-recovery after loss.
local raw=redis.call('GET',KEYS[1])
if not raw then return {'HOLD','MISSING_EPOCH'} end
local s=cjson.decode(raw)
if s.epoch~=ARGV[1] then return {'HOLD','STALE_EPOCH'} end
local tm=redis.call('TIME');local now=tonumber(tm[1])*1000+math.floor(tonumber(tm[2])/1000)
if now<s.lastTime then return {'HOLD','CLOCK_REGRESSION'} end
s.lastTime=now
local id=ARGV[2];local dest=ARGV[3];local class=ARGV[4]
local count=0;local dc=0
for k,w in pairs(s.waiters) do
 if w.expires<=now then s.waiters[k]=nil else count=count+1;if w.dest==dest then dc=dc+1 end end
end
for k,v in pairs(s.dests) do if v<=now then s.dests[k]=nil end end
if not s.waiters[id] then
 if count>=1024 or dc>=64 then return {'HOLD','WAITER_CAP'} end
 s.seq=s.seq+1;s.waiters[id]={dest=dest,class=class,seq=s.seq,expires=now+2000}
else s.waiters[id].expires=now+2000 end
s.cooldown=math.max(s.cooldown,tonumber(ARGV[5]))
local ready=math.max(s.holdUntil,s.globalNext,s.cooldown)
if now<ready then redis.call('SET',KEYS[1],cjson.encode(s));return {'WAIT',tostring(math.min(200,ready-now))} end
local preferred=s.turn%3==2 and 'BACKGROUND' or 'INTERACTIVE'
local chosen=nil;local fallback=nil
for k,w in pairs(s.waiters) do
 if not s.dests[w.dest] or s.dests[w.dest]<=now then
  if not fallback or w.seq<s.waiters[fallback].seq then fallback=k end
  if w.class==preferred and (not chosen or w.seq<s.waiters[chosen].seq) then chosen=k end
 end
end
chosen=chosen or fallback
if chosen~=id then redis.call('SET',KEYS[1],cjson.encode(s));return {'WAIT','25'} end
s.globalNext=now+50;s.dests[dest]=now+600;s.turn=s.turn+1;s.waiters[id]=nil
redis.call('SET',KEYS[1],cjson.encode(s))
return {'GRANTED',tostring(now)}
