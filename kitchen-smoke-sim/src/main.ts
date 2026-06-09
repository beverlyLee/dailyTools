import { KitchenSmokeApp } from './App';

const app = new KitchenSmokeApp('kitchen-canvas');

(window as any).app = app;
(window as any).kitchenSmokeApp = app;
