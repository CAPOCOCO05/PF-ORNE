import { crearApp } from './app';
import { ENV } from './config/env';

// arranca la API en todas las interfaces de red para que el celular la alcance por la IP de la PC
crearApp().listen(ENV.PORT, '0.0.0.0', () => {
    console.log(`API de ORNE escuchando en http://localhost:${ENV.PORT}`);
});
