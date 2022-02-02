// Zombular 3.9.2, (C) Michael Lazarev, 2015-2021
import {vdom} from './cito.js';

export function SKIP() {}
export function once(v) {
    let done = false;
    return () => done ? SKIP : (done=true, v);
}

class Elem { constructor(c) { this.children = c; } }
const isRawObj = o => o && (Object.getPrototypeOf(o) === Object.prototype);
const prim = v => (typeof v === 'function') ? v() : v;
const tree = a => Array.isArray(a) ? new Elem(a.map(tree))
  : a === SKIP ? a
  : typeof a === 'function' ? tree(a())
  : (a === false || a == null) ? ({}) // null or undefined result in an empty fragment
  : !(a instanceof Elem) ? String(a)
  : a;

function zed(tag, classes, props, children) {
    let result = tree(children);
    if (tag === '_') return result;
    result.tag = tag;
    if (props.key != null) {
        result.key = props.key;
        delete props.key;
    }
    delete props.classes;
    if (['<', '!'].indexOf(tag) === -1) {
        result.events = {};
        result.attrs = {};
        for (let k in props) if (props.hasOwnProperty(k)) {
            let v = props[k];
            if (props[k] === undefined) continue;
            k.startsWith('on')
            && (typeof(v) === 'function'
                || Array.isArray(v) && v.every(e => typeof(e) === 'function'))
            ? result.events[k.substr(2)] = v
            : result.attrs[k] = prim(v)
        }
        if (classes && classes.length) result.attrs.class = classes;
    }
    return result;
}

const combine = (a, b) =>
  b
  ? isRawObj(b)
      ? [...a, ...Object.keys(b).filter(k => prim(b[k]))]
      : a.concat(b)
  : a;

export const z = (function makeZed(tag='div', classes=[]) {
    return new Proxy(zed, {
      get: (_, prop) => {
          return (prop.match(/^[A-Z]|^[<!_]$/))
             ? makeZed(prop.toLowerCase(), classes)
             : makeZed(tag, [...classes, prop]);
      },
      set: () => false,
      apply: (_, thisArg, args) => () => {
          let a = [...args], props = {};
          if (a.length > 0) {
              if (typeof a[0] === 'function') a[0] = a[0]();
              if (isRawObj(a[0])) props = a.shift();
          }
          return zed(
            prim(props.tag) || tag,
            combine(classes, prim(props.classes)).join(' '),
            {...props},
            a);
      }
    });
})();

export function after(t=0) {
    return new Promise(ok => setTimeout(ok, t));
}

export function throttle(t, f) {
    let done, waiting, throttled = () => waiting = waiting ||
      setTimeout(() => { let _done = done; reset(); f(); _done(); }, t);
    function reset() {
        throttled.completed = new Promise((ok) => done = ok);
        waiting = false;
    }
    reset();
    return throttled;
}
// TODO: await body.update.completed
//       await body.nextUpdate()
// or, switch to event handlers
export function attach(el) {
    let vEl;
    const update = throttle(0, () => { // TODO: async fn update() { await after(); ... }
        let vTree = tree(contents);
        if (vEl) vdom.update(vEl, vTree); else vEl = vdom.append(el, vTree);
    });
    const Val = (v, ...ah) => {
      return (...a) => {
          if (a.length === 0) return v;
          update();
          let res = v; // assignment returns a previously stored value
          if (a.length === 1) {
              v = a[0];
          } else {
              let vx = a.slice(0, -2).reduce((v, i) => v[i], v);
              res = vx[a[a.length-2]];
              vx[a[a.length-2]] = a[a.length-1];
          }
          ah.forEach(f => f(v));
          return res;
      };
    };
    const contents = Object.assign(Val(), {update, Val});
    return contents;
}

export const body = attach(document.body);
export const Val = body.Val;
export const Ref = (o, f, ff) =>  (...v) => v.length === 0 ? o[f] : (o[f] = v[0], ff && ff(v[0]), body.update());