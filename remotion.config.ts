import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('png');   // графика без артефактов JPEG
Config.setPixelFormat('yuv420p');    // совместимость с соцсетями
Config.setCodec('h264');
Config.setCrf(17);                   // визуально без потерь для плоской графики
Config.setChromiumOpenGlRenderer('angle');
Config.setEntryPoint('index.ts');
Config.setOverwriteOutput(true);
