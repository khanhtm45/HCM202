import { chromium } from 'playwright';

const URL = 'http://localhost:8765/hcmverse_hcm202/?fast=1';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.goto(URL, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(
  () => {
    try {
      return (
        galleryServices?._galleryArtifactPatched &&
        util?.general?.autoCompleteUrl &&
        util?.general?.autoCompleteUrl?._galleryArtifactUrlPatched
      );
    } catch {
      return false;
    }
  },
  { timeout: 120000 }
);

const result = await page.evaluate(async () => {
  const models = await materialServices.getModels('vn');
  const model = models?.find((m) => m.name?.includes('Trống')) || models?.[0];
  if (!model) return { error: 'no models' };

  const dataVoice = await galleryServices.getAudioObject(model.id, 'vn');
  const voiceUrl = util.general.autoCompleteUrl(dataVoice?.file);

  const badIframe =
    location.origin +
    `/managements/admin/modules/management_model/html/loadModel.html?id=20250624&model_id=${model.id}`;
  const fixedIframe = util.general.createElement('iframe', '', { src: badIframe }).src;

  let audioOk = false;
  if (voiceUrl) {
    try {
      audioOk = (await fetch(voiceUrl, { method: 'HEAD' })).ok;
    } catch (_) {}
  }

  return {
    modelId: model.id,
    modelName: model.name,
    rawAudio: dataVoice?.file,
    voiceUrl,
    audioOk,
    badIframe,
    fixedIframe,
    iframeUsesSanpham: fixedIframe.includes('sanpham.starglobal3d.vn'),
  };
});

console.log(JSON.stringify(result, null, 2));
await browser.close();
