const data=[
['Image → Mesh',26,'Reconstruct the geometry of the pictured asset and deliver an editable mesh.'],
['Animation',20,'Use the supplied character and rig to recover the motion in a reference video.'],
['Camera',10,'Recover the camera pose and field of view without changing the supplied scene.'],
['Layout',10,'Arrange the supplied objects to match the spatial relationships in a reference scene.'],
['Mesh → UV',10,'Unwrap the supplied mesh and preserve its geometry in the delivered asset.'],
['Retopology',10,'Build a lower-complexity mesh that preserves the source shape.'],
['Rendering',3,'Repair the renderer and reproduce the prescribed reference views.'],
['PSD composition',2,'Adapt a layered composition and deliver both the editable document and its exported image.']];
const q=s=>document.querySelector(s);
function show(i){let [name,n,brief]=data[i];q('#name').textContent=name;q('#count').textContent=n+' tasks';q('#brief').textContent=brief;[...q('#choices').children].forEach((b,j)=>b.setAttribute('aria-pressed',i===j))}
data.forEach(([name,n],i)=>{let row=document.createElement('div');row.innerHTML='<span>'+name+'</span><b>'+n+'</b>';q('#families').append(row);let b=document.createElement('button');b.textContent=name;b.onclick=()=>show(i);q('#choices').append(b)});show(0);
const models=[['Example A',[60,64,82,76,41,73,58,65]],['Example B',[52,70,72,65,50,71,53,49]],['Example C',[48,49,68,50,46,62,51,55]]];
['Overall',...data.map(x=>x[0])].forEach(x=>q('#metric').add(new Option(x,x)));
function scores(){const i=q('#metric').selectedIndex-1;q('#measure').textContent=q('#metric').value;q('tbody').innerHTML=models.map(([m,s])=>[m,i<0?s.reduce((a,v,j)=>a+v*data[j][1],0)/91:s[i]]).sort((a,b)=>b[1]-a[1]).map(([m,s],j)=>'<tr><td>'+String(j+1).padStart(2,'0')+'</td><td>'+m+'</td><td><meter min="0" max="100" value="'+s+'"></meter></td><td>'+s.toFixed(1)+'</td></tr>').join('')}q('#metric').onchange=scores;scores();
