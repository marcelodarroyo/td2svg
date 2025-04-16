//=============================================================================
// Simple text (ascii) diagrams to svg
// Author: Marcelo Arroyo (marcelo.arroyo@gmail.com)
// Date: 2023
//=============================================================================

function diagram2svg(text) {
    const fontSize = '12px';
    const fontFamily = 'monospace';
    // const cw = Math.round(characterWidth() * 10) / 10;
    const cw = 7;                       // svg character width box
    const ch = 12;                      // svg character height box
    const ns = 'xmlns="http://www.w3.org/2000/svg"';
    const style = extractStyle();       // extract style tag
    let   lines = text.split('\n');     // iterate on lines of diagram
    let   width = diagramWidth();       // in characters
    let   shapes = rects();             // get rectangles
    const hl = horizontalLines();       // generate svg horizontal lines
    const vl = verticalLines();         // generate svg vertical lines
    const ca = crossAndArrows();        // generate svg cross and arrows
    const texts = genTexts();           // generate svg texts
    const w = (width+2) * cw;           // svg width
    const h = (lines.length+2) * ch;    // svg height
    const viewBox = `viewBox="0 0 ${w} ${h}"`;
    const svg = `<svg width="${w}" height="${h}" ${viewBox} ${ns}>\n`;

    function diagramWidth() {
        let w = 0
        lines.forEach( line => w = Math.max(w, line.length) );
        return w;
    }

    /*
    function characterWidth() {
        let canvas = document.createElement('canvas');
        let ctx = canvas.getContext("2d");
        ctx.font = `${fontSize} ${fontFamily}`;
        return ctx.measureText('M').width;
    }
    */

    function c(i,j) {
        return lines[i][j];
    }

    function rightOf(i, j) {
        return (j + 1 < lines[i].length) ? c(i,j+1) : ' ';
    } 

    function leftOf(i, j) {
        return (j > 0) ? c(i,j-1) : ' ';
    }

    function aboveOf(i, j) {
        return (i > 0 && j < lines[i-1].length) ? c(i-1,j) : ' ';
    }

    function belowOf(i, j) {
        return (i + 1 < lines.length && j < lines[i+1].length) ? 
                c(i+1,j) : ' ';
    }

    function isVertical(c) {
        return c == '|' || c == '^' || c == '+' || c == 'v';
    }

    function isHorizontal(c) {
        return c == '-' || c == '+';
    }

    // is d[i,j] a rectangle top left corner?
    function isTLC(i, j) {
        const r = rightOf(i,j), b = belowOf(i,j);
        return c(i,j) == '+' && isHorizontal(r) && isVertical(b);
    }

    // is d[i,j] a rectangle top right corner?
    function isTRC(i, j) {
        const l = leftOf(i,j), b = belowOf(i,j);
        return c(i,j) == '+' && isHorizontal(l) && isVertical(b);
    }

    // is d[i,j] a rectangle bottom left corner?
    function isBLC(i, j) {
        const a = aboveOf(i,j), r = rightOf(i,j)
        return lines[i][j] == '+' && isVertical(a) && isHorizontal(r);
    }

    // is d[i,j] a rectangle bottom right corner?
    function isBRC(i, j) {
        const a = aboveOf(i,j), l = leftOf(i,j)
        return lines[i][j] == '+' && isVertical(a) && isHorizontal(l);
    }

    // extract <style>...</style> from diagram text
    function extractStyle() {
        let match = text.match(/\n *<style> *\n/);
        let result = '';
        if (match) {
            result = text.substring(match.index);
            text = text.substring(0, match.index);
        }
        return result;
    }

    // there is a rectangle with top-left corner at (i,j)?
    // Return object {x1, y1, x2, y2}
    function getBox(i, j) {
        if (!isTLC(i, j)) return null;
        let box = {x1: j, y1: i};

        // check top edge
        while (j < lines[i].length && isHorizontal(c(i, j)) && !isTRC(i, j))
            j++;
        if (j - box.x1 < 2) return null;
        box.x2 = j;
        
        // check left edge
        j = box.x1; i++;
        while (i < lines.length && isVertical(c(i, j)) && !isBLC(i, j))
            i++;
        if (i - box.y1 < 2) return null;
        box.y2 = i;
        
        // check bottom edge (i is at bottom line)
        j = box.x1;
        if (i >= lines.length) {
            console.log('Panic: i=' + i);
            return null;
        }
        while (j < lines[i].length && isHorizontal(c(i, j)) && !isBRC(i, j))
            j++;
        if (j != box.x2) return null;
        
        // check right edge
        j = box.x2; i = box.y1 + 1;
        while (i < lines.length && isVertical(c(i, j)) && !isBRC(i, j))
            i++;
        if (i != box.y2) return null
        
        return box;
    }

    // generate rectangles
    function rects() {
        let r = [];
        for (let i = 0; i < lines.length; i++) {
            let j = 0;
            while (j < lines[i].length) {
                let box = getBox(i, j);
                if (box) {
                    r.push(box);
                    j = box.x2 + 1;
                } else {
                    j++;
                }
            }
        }
        return r;
    }

    // generate rectangles. Do it after genTexts() because it add shape ids
    function genRects() {
        const attrs = 'stroke="black" fill="none"'
        let r = '', c = 0;
        for (let s of shapes) {
            const id  = s.id || `rect-${++c}`;
            const cls = 'class="' + (s.cls || 'rect') + '"';
            const x = s.x1 * cw + cw / 2,
                  y = s.y1 * ch + ch / 2,
                  w = (s.x2 - s.x1) * cw,
                  h = (s.y2 - s.y1) * ch;
            r += `<rect id="${id}" ${cls} ${attrs} x="${x}" y="${y}" ` +
                 `width="${w}" height="${h}"></rect>\n`;
        }
        return r;
    }

    // is text inside a shape?
    function insideShape(i, j) {
        for (let s of shapes) {
            if (j > s.x1 && j < s.x2 && i > s.y1 && i < s.y2)
                return s
        }
        return null;
    }

    // add ic or class to shape
    function addIdOrClassToShape(shape, id_or_class) {
        if (!shape.id) {
            const txt = id_or_class.substring(1);
            if (id_or_class[0] == '#')
                shape.id = txt;
            else
                shape.cls = txt;
        }
    }

    // Generate svg text elements and set shape ids
    function genTexts() {
        let texts = '';
        let re = /[#.]?[a-z0-9_.#\(\[]\S*/ig;
        let ta = `font-size="${fontSize}" font-family="${fontFamily}"`;
        for (let i = 0; i < lines.length; i++) {
            re.lastIndex = 0;
            let match;
            while ( match = re.exec(lines[i]) ) {
                const txt = match[0];
                const j = match.index;
                const isArrow = txt == 'v' && isVertical(aboveOf(i, j));
                const id_cls = txt[0] == '#' || txt[0] == '.';
                let s = insideShape(i,j)
                if (id_cls && s && txt.length > 1 && match[0][1] != '.') {
                    addIdOrClassToShape(s, txt);
                }
                else if (!isArrow) {
                    const t = match[0],
                          x = j * cw, 
                          y = i * ch + ch;
                    texts += `<text x="${x}" y="${y}" ${ta}>${t}</text>\n`;
                }
            }
        }
        return texts;
    }

    // is text inside a shape?
    function cornerOfShape(x, y) {
        for (let s of shapes) {
            if ((x == s.x1 && y == s.y1) || (x == s.x2 && y == s.y1) ||
                (x == s.x1 && y == s.y2) || (x == s.x2 && y == s.y2))
                return true
        }
        return false;
    }

    // detect the type of line connector +, <, >, ^, v
    function crossAndArrows() {
        let r = '';
        const p = '<path stroke="black" d=';

        for (let i=0; i < lines.length; i++) {
            let re = /[+><^v\\/]/g;
            let m; 
            while (m = re.exec(lines[i])) {
                const j = m.index;
                const c = lines[i][j];
                const x1 = j * cw;
                const y1 = i * ch;
                const x2 = x1 + cw;
                const y2 = y1 + ch;
                const ym = y1 + ch/2;
                const xm = x1 + cw/2;
                const right = rightOf(i, j);
                const left  = leftOf(i, j);
                const above = aboveOf(i, j);
                const below = belowOf(i, j);

                if (c == '+' && !cornerOfShape(j, i)) {
                    if (left == '-' && right == '-' && 
                        isVertical(above) && isVertical(below)) {
                        // full cross
                        const d = `M ${x1},${ym} H ${x2} ` +
                                  `M ${xm},${y1} V ${y2}`;
                        r += `${p}"${d}" />\n`;
                        continue;
                    }
                    if (left == '-' && right == '-' && isVertical(above)) {
                        // bottom cross
                        const d = `M ${x1},${ym} H ${x2} ` +
                                  `M ${xm},${ym} V ${y1}`;
                        r += `${p}"${d}" />\n`;
                        continue;
                    }
                    if (left == '-' && right == '-' && isVertical(below)) {
                        // top cross
                        const d = `M ${x1},${ym} H ${x2} ` +
                                  `M ${xm},${ym} V ${y2}`;
                        r += `${p}"${d}" />\n`;
                        continue;
                    }
                    if (right == '-' && isVertical(above) && isVertical(below)) {
                        // right cross
                        const d = `M ${xm},${ym} H ${x2} ` +
                                  `M ${xm},${y1} V ${y2}`;
                        r += `${p}"${d}" />\n`;
                        continue;
                    }
                    if (left == '-' && isVertical(above) && isVertical(below)) {
                        // left cross
                        const d = `M ${x1},${ym} H ${xm} ` +
                                  `M ${xm},${y1} V ${y2}`;
                        r += `${p}"${d}" />\n`;
                        continue;
                    }
                    if (right == '-' && (below == '|' || below == '+')) {
                        // top-left corner
                        const d = `M ${xm},${y2} V ${ym} H ${x2}`;
                        r += `${p}"${d}" fill="none" />\n`;
                        continue;
                    }
                    if (left  == '-' && (below == '|' || below == '+')) {
                        // top-right corner
                        const d = `M ${x1},${ym} H ${xm} V ${y2}`;
                        r += `${p}"${d}" fill="none" />\n`;
                        continue;
                    }
                    if (right == '-' && (above == '|' || above == '+')) {
                        // bottom-left corner
                        const d = `M ${xm},${y1} V ${ym} H ${x2}`;
                        r += `${p}"${d}" fill="none" />\n`;
                        continue;
                    }
                    if (left  == '-' && (above == '|' || above == '+')) {
                        // bottom-right corner
                        const d = `M ${x1},${ym} H ${xm} V ${y1}`;
                        r += `${p}"${d}" fill="none" />\n`;
                        continue;
                    }
                }
                if (c == '>' && left == '-') {
                    // right arrow
                    const d = `M ${x1},${ym} L ${x2},${ym} M ${x1},${ym} L ${x1+2},${ym} M ${x1+2},${y1+2} L ${x2+3},${ym} L ${x1+2},${y2-2}`;
                    r += `${p}"${d}" fill="none" />\n`;
                    continue;
                }
                if (c == '>' && left == ':') {
                    // right bracket middle arrow (:>)
                    const x = x1 - cw/2;
                    const d = `M ${x},${y1} L ${x1},${ym} L ${x},${y2}`;
                    r += `${p}"${d}" fill="none" />\n`;
                    continue;
                }
                if (c == '<' && right == '-') {
                    // left arrow
                    const d = `M ${x1},${ym} L ${x2},${ym} M ${x2},${ym} L ${x2-2},${ym} M ${x2-2},${y1+2} L ${x1-3},${ym} L ${x2-2},${y2-2}`;
                    r += `${p}"${d}" fill="none" />\n`;
                    continue;
                }
                if (c == '<' && right == ':') {
                    // left bracket middle angle (<:)
                    const x = x2 + cw/2;
                    const d = `M ${x},${y1} L ${x2},${ym} L ${x},${y2}`;
                    r += `${p}"${d}" fill="none" />\n`;
                    continue;
                }
                if (c == '^' && isVertical(below)) {
                    // up arrow
                    const d = `M ${xm},${y2} L ${xm},${y1} M ${xm},${y1} L ${x1},${y2-3} M ${xm},${y1} L ${x2},${y2-3}`;
                    r += `${p}"${d}" fill="none" />\n`;
                    continue;
                }
                if (c == 'v' && isVertical(above)) {
                    // down arrow 
                    const d = `M ${xm},${y1} L ${xm},${y2} M ${x1},${y1+3} L ${xm},${y2} M ${x2},${y1+3} L ${xm},${y2}`;
                    r += `${p}"${d}" fill="none" />\n`;
                    continue;
                }
                if (c == '\\' && leftOf(i,j) == ' ' && rightOf(i,j) == ' ') {
                    const d = `M ${x1},${ym} L ${xm},${y2}`;
                    r += `${p}"${d}" fill="none" />\n`;
                    continue;
                }
                if (c == '/' && leftOf(i,j) == ' ' && rightOf(i,j) == ' ') {
                    const d = `M ${x1},${ym} L ${xm},${y1}`;
                    r += `${p}"${d}" fill="none" />\n`;
                    continue;
                }
                /*
                if (c == '\\' && leftOf(i,j) == ' ' && rightOf(i,j) == ' ') {
                    // 
                    const d = `M ${xm},${y1} L ${x2},${ym}`;
                    r += `${p}"${d}" fill="none" />\n`;
                    continue;
                }
                if (c == '/' && leftOf(i,j) == '-' && rightOf(i,j) == ' ') {
                    const d = `M ${x1},${ym} L ${xm},${y1}`;
                    r += `${p}"${d}" fill="none" />\n`;
                    continue;
                }
                */
            }
        }
        return r;
    }

    // is character at position (i,j) on edge of some polygon?
    function onEdgeOfShape(i,j) {
        for (let s of shapes) {
            if ((i == s.y1 || i == s.y2) && j >= s.x1 && j <= s.x2)
                return true;    // in top or bottom edge
            if ((j == s.x1 || j == s.x2) && i >= s.y1 && i <= s.y2)
                return true;    // in left or right edge
        }
        return false;
    }

    function horizontalLines() {
        const l = '<line stroke="black"';
        let r = '';
        for (let i=0; i < lines.length; i++) {
            if (lines[i].length > width) 
                width = lines[i].length;
            for (let j=0; j < lines[i].length; j++) {
                if (lines[i][j] == '-' && !onEdgeOfShape(i,j)) {
                    const x1 = j * cw;
                    const y = i * ch + ch/2;
                    let   x2 = x1 + cw;
                    j++;
                    while (lines[i].length > j && lines[i][j] == '-')
                        x2 = ++j * cw;
                    r += `${l} x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/>\n`;
                }
            }
        }
        return r;
    }

    function verticalLines() {
        const l = '<line stroke="black"';
        const p = '<path stroke="black"';
        let r = '';
        for (let j=0; j < width; j++) {
            for (let i=0; i < lines.length; i++) {
                if (j >= lines[i].length) continue;
                if (lines[i][j] == '|' && !onEdgeOfShape(i,j)) {
                    const x = j * cw + cw/2;
                    const y1 = i * ch;
                    let   y2 = y1 + ch;
                    while (++i < lines.length && lines[i][j] == '|')
                        y2 = (i+1) * ch;
                    r += `${l} x1="${x}" y1="${y1}" x2="${x}" y2="${y2}"/>\n`;
                }
            }
        }
        return r;
    }

    return svg + genRects() + hl + vl + ca + texts + style + '</svg>\n';
}

/*
const example = 
`
    +-----------------------------------------+  \\
    |#u        Programas de usuarios          |  |
    |        ofimática, navegador web,        |  |
    |                juegos, ...              |  |
    +-----------------------------------------+  :> modo usuario
    |       Herramientas del sistema          |  |
    |   biblioteca estándar, linker, shells,  |  |
    |    servicios (impresión, red...)        |  |
    +-------------------+---------------------+  /
                        |
    +-------------------+---------------------+
    |#os            OS kernel                 |<--- modo supervisor
    +-------------------+---------------------+
                        |
    +-------------------+---------------------+
    |#h              Hardware                 |
    |  CPUs, Memoria (RAM), discos, red...    |
    +-----------------------------------------+

    <style>
    #h {fill: crimson;}
    #os {fill: coral;}
    #u {fill: cyan;}
    rect {
    fill: white;
    filter: drop-shadow(0px 4px 4px rgba(0, 0, 0, 0.4));
    }
    </style>
`

console.log( diagram2svg(example) );
*/
