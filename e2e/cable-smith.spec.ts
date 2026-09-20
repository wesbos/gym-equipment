import {test,expect,chromium} from '@playwright/test';
import {applyPreset,RACK_PRESETS} from '../rack-generator/presets.ts';
import {withSystem} from '../rack-generator/systems.ts';
import {validateAssembly} from '../rack-generator/assembly.ts';
import {addFloorItem} from '../rack-generator/floor-items.ts';

test('gym-wave2-cable_smith-final: raised Kraken, combined systems, contextual resets and GLB',async()=>{
 test.setTimeout(180000);
 // Serves from GYM_CABLE_BASE_URL (default :5307); GYM_CABLE_URL (a full /builder URL) is still honoured.
 const base=process.env.GYM_CABLE_BASE_URL??'http://127.0.0.1:5307';
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
 try {
  const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.GYM_CABLE_URL??`${base}/builder`);
  const load=async(doc:ReturnType<typeof applyPreset>)=>page.locator('input[type=file]').setInputFiles({name:'cable-smith-acceptance.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(validateAssembly(doc)))});
  const ready=async()=>{
    await page.locator('#export').click();
    await page.getByRole('menuitemradio',{name:/GLB/}).click();
    await expect(page.getByRole('button',{name:'Download GLB',exact:true})).toBeEnabled({timeout:45000});
    await page.keyboard.press('Escape');
  };
  const bos=applyPreset(RACK_PRESETS.find(p=>p.profileId==='bos-manticore'&&p.kind==='six'&&p.height===2743.2&&p.depth===762)!.id);
  await load(withSystem(bos,'cable-kraken',{adapter:1}));await ready();
  await page.getByRole('button',{name:'Fit view',exact:true}).click();
  await page.screenshot({path:'/tmp/gym-cable-browser-kraken108.png'});
  console.log('108-inch Kraken scene ready');
  const rep=applyPreset(RACK_PRESETS.find(p=>p.profileId==='rep-pr-5000'&&p.kind==='six'&&p.height===2032&&p.depth===762)!.id);
  const combined=addFloorItem(withSystem(withSystem(rep,'cable-ares2'),'smith-rep',{angle:5,barHeight:600,safetyHeight:400}),'rep-nighthawk');
  await load(combined);
  await page.locator('.system-controls > summary').click();
  const safety=page.getByRole('spinbutton',{name:'Smith safety height',exact:true}),bar=page.getByRole('spinbutton',{name:'Smith bar height',exact:true});
  const heightsAgree=async()=>{
    for(const [label,input] of [['Smith safety height',safety],['Smith bar height',bar]] as const) {
      expect(await input.evaluate((element:HTMLInputElement)=>element.validity.valid)).toBe(true);
      await expect(page.getByRole('slider',{name:label+' slider',exact:true})).toHaveValue(await input.inputValue());
    }
  };
  await heightsAgree();
  await page.getByRole('button',{name:'Reset Smith safety height',exact:true}).click();
  await expect(safety).toHaveValue('450');await expect(bar).toHaveValue('600');
  await heightsAgree();
  await expect(page.getByRole('button',{name:'Reset Smith safety height',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(safety).toHaveValue('400');
  await safety.fill('246');await safety.press('Enter');await bar.fill('396');await bar.press('Enter');
  await expect(bar).toHaveValue('396');await expect(safety).toHaveValue('246');
  await heightsAgree();
  await expect(page.getByRole('button',{name:'Reset Smith safety height',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Reset Smith bar height',exact:true}).click();await expect(bar).toHaveValue('1100');
  await bar.fill('1600');await bar.press('Enter');await safety.fill('1400');await safety.press('Enter');
  await page.getByRole('button',{name:'Reset Smith bar height',exact:true}).click();
  await expect(bar).toHaveValue('1550');await expect(safety).toHaveValue('1400');
  await expect(page.getByRole('button',{name:'Reset Smith bar height',exact:true})).toBeDisabled();
  await heightsAgree();
  await safety.fill('650.5');await safety.press('Enter');await heightsAgree();
  await safety.press('ArrowUp');await expect(safety).toHaveValue('655.5');await heightsAgree();
  await ready();await page.getByRole('button',{name:'Fit view',exact:true}).click();
  await page.screenshot({path:'/tmp/gym-cable-browser-ares-smith.png'});
  await page.locator('#export').click();const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Download GLB',exact:true}).click();
  const download=await downloadPromise;expect(await download.failure()).toBeNull();
  expect(errors).toEqual([]);console.log('Smith contextual reset/undo/travel bounds and combined ARES/bench GLB passed');
 } finally {await browser.close();}
});
