import './tailwindcss.js';
import { body, z } from './z/z3.9.js';
import Game from './game.js'; 

const app = z['top-0 left-0 right-0 bottom-0 absolute bg-neutral-100'](Game());
    
body(app);
