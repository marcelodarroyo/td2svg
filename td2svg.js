//=============================================================================
// Simple text (ascii) diagrams to svg
// Author: Marcelo Arroyo (marcelo.arroyo@gmail.com)
// Date: 2023
//=============================================================================

function diagram2svg(text) {
    const cw = 8, ch = 12;
    const ns = 'xmlns="http://www.w3.org/2000/svg"';
    const style = extractStyle();
    let lines = text.split('\n');
    const ids = extractIds();
    let width = 0;

    function rightOf(i, j) {
        return (j + 1 < lines[i].length) ? lines[i][j+1] : ' ';
    } 
        
    function leftOf(i, j) {
        return (j > 0) ? lines[i][j-1] : ' ';
    }
    
    function aboveOf(i, j) {
        return (i > 0 && j < lines[i-1].length) ? lines[i-1][j] : ' ';
    }

    function belowOf(i, j) {
        return (i + 1 < lines.length) ? lines[i+1][j] : ' ';
    }

    function isVertical(c) {
        return c == '|'|| c == '^' || c == '+' || c == 'v';
    }

    // is d[i,j] a rectangle top right corner?
    function isTRC(i, j) {
        return (lines[i][j] == '+' || lines[i][j] == '.') && rightOf(i,j) != '-';
    }

    // is d[i,j] a rectangle bottom left corner?
    function isBLC(i, j) {
        return (lines[i][j] == '+' || lines[i][j] == "'") && rightOf(i,j) == '-';
    }

    // extract <style>...</style> from input diagram text
    function extractStyle() {
        const textStyle = 'text {font-size: 10pt; font-family: "monospace";}';
        let match = text.match(/\n *<style> *\n/);
        let result = `<style>${textStyle}</style>\n`;
        if (match) {
            result += text.substring(match.index);
            text = text.substring(0, match.index);
        }
        return result;
    }

    // Generate svg text elements
    function genTexts() {
        const ta = 'dominant-baseline="middle"';
        let texts = '';
        let re = / ([^-|+><\^\/\\ ]+)/ig;
        for (let i = 0; i < lines.length; i++) {
            re.lastIndex = 0;
            let match;
            while ( match = re.exec(lines[i]) ) {
                const j = match.index + 1;
                const isArrow = match[1] == 'v' && isVertical(aboveOf(i, j));
                if (!isArrow) {
                    const s = match[0], 
                          x = j * cw, 
                          y = i * ch + (ch / 2);
                    texts += `<text x="${x}" y="${y}" ${ta}>${s}</text>\n`;
                }
            }
        }
        return texts;
    }

    // extract rectangle identifiers with rectangle position and size
    // ids have to place in top-left corner of rectangle
    function extractIds() {
        let ids = [];
        let rule = /\|([#.]\S+)/g;
        for (let i = 0; i < lines.length; i++) {
            let match;
            rule.lastIndex = 0;
            while ( match = rule.exec(lines[i]) ) {
                let id = {
                    id: match[1],
                    line: i, 
                    column: match.index + 1,
                    rect: {x: match.index + 1, y: i-1}
                };
                let x2 = id.column + id.id.length, y2 = i + 1;
                while (x2 < lines[i].length && !isTRC(i-1,x2)) x2++;
                while (y2 < lines.length && !isBLC(y2, match.index)) y2++;
                id.rect.w = x2 - id.rect.x + 1;
                id.rect.h = y2 - id.rect.y;
                ids.push(id);
            }
        }
        // replace identifiers by spaces
        for (let id of ids) {
            const spaces = ' '.repeat(id.id.length);
            lines[id.line] = lines[id.line].replaceAll(id.id, spaces);
        }
        return ids;
    }

    // Generate svg rectangles from ids for background styling
    function genBgRects() {
        let rects = '';
        for (let id of ids) {
            const name = id.id.substring(1);
            const ic = id.id[0] == '#' ? 'id' : 'class';
            const r = `<rect ${ic}="${name}" `;
            const x = id.rect.x * cw - cw / 2;
            const y = id.rect.y * ch + ch / 2;
            const w = id.rect.w * cw;
            const h = id.rect.h * ch;
            rects += `${r} x="${x}" y="${y}" width="${w}" height="${h}"/>\n`;
        }
        return rects;
    }

    // detect the type of line connection: (i, j) is the '+' coordinate
    function cross(i, j) {
        let right = rightOf(i, j);
        let left  = leftOf(i, j);
        let above = aboveOf(i, j);
        let below = belowOf(i, j);
        
        if (left == '-' && right == '-' && isVertical(above) && isVertical(below))
            return 'cross';

        if (left == '-' && right == '-' && below == '|')
            return 'cross-bottom';
        if (left == '-' && right == '-' && above == '|')
            return 'cross-top';
        if (right == '-' && above == '|' && below == '|')
            return 'cross-left';
        if (left == '-' && above == '|' && below == '|')
            return 'cross-right';

        if (right == '-' && below == '|') return 'top-left';
        if (left  == '-' && below == '|') return 'top-right';
        if (right == '-' && above == '|') return 'bottom-left';
        if (left  == '-' && above == '|') return 'bottom-right';

        return ' ';
    }

    // generate svg line elements from diagram
    function genLines() {
        const l = '<line stroke="black"';
        const p = '<path stroke="black"';
        let r = '';
        for (let i=0; i < lines.length; i++) {
            for (let j=0; j < lines[i].length; j++) {
                if (lines[i].length > width) 
                    width = lines[i].length;
                const c = lines[i][j];
                let x1 = j * cw;
                let y1 = i * ch;
                let x2 = j * cw + cw;
                let y2 = i * ch + ch; 
                switch (c) {
                    case '-': 
                        y1 += ch / 2;
                        r += `${l} x1="${x1}" y1="${y1}" x2="${x2}" y2="${y1}" />\n`;
                        break;
                    case '|':
                        x1 += cw / 2; 
                        r += `${l} x1="${x1}" y1="${y1}" x2="${x1}" y2="${y2}" />\n`;
                        break;
                    case '/':
                        x2 -= cw / 2; y2 -= ch / 2;
                        r += `${l} x1="${x1}" y1="${y2}" x2="${x2}" y2="${y1}" />\n`;
                        break;
                    case '\\': 
                        x2 -= cw / 2; y1 += ch / 2;
                        r += `${l} x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />\n`;
                        break;
                    case '+':
                        switch (cross(i, j)) {
                            case 'top-left':
                                x1 += cw / 2; y1 += ch / 2;
                                r += `${l} x1="${x1}" y1="${y1}" x2="${x2}" y2="${y1}"/>\n`;
                                r += `${l} x1="${x1}" y1="${y1}" x2="${x1}" y2="${y2}"/>\n`;
                                break;
                            case 'top-right':
                                x2 -= cw / 2; y1 += ch / 2;
                                r += `${l} x1="${x1}" y1="${y1}" x2="${x2}" y2="${y1}"/>\n`;
                                r += `${l} x1="${x2}" y1="${y1}" x2="${x2}" y2="${y2}"/>\n`;
                                break;
                            case 'bottom-left':
                                x1 += cw / 2; y2 -= ch / 2;
                                r += `${l} x1="${x1}" y1="${y2}" x2="${x2}" y2="${y2}"/>\n`;
                                r += `${l} x1="${x1}" y1="${y2}" x2="${x1}" y2="${y1}"/>\n`;
                                break;
                            case 'bottom-right':
                                x2 -= cw / 2; y2 -= ch / 2;
                                r += `${l} x1="${x1}" y1="${y2}" x2="${x2}" y2="${y2}"/>\n`;
                                r += `${l} x1="${x2}" y1="${y2}" x2="${x2}" y2="${y1}"/>\n`;
                                break;
                            case 'cross':
                                y1 += ch / 2;
                                r += `${l} x1="${x1}" y1="${y1}" x2="${x2}" y2="${y1}"/>\n`;
                                x1 += cw / 2; y1 -= ch / 2;
                                r += `${l} x1="${x1}" y1="${y1}" x2="${x1}" y2="${y2}"/>\n`;
                                break;
                            case 'cross-top':
                                y1 += ch / 2;
                                r += `${l} x1="${x1}" y1="${y1}" x2="${x1}" y2="${y1}"/>\n`;
                                x1 += cw / 2; y1 -= ch / 2; y2 -= ch / 2;
                                r += `${l} x1="${x1}" y1="${y2}" x2="${x1}" y2="${y1}"/>\n`;
                                break;
                            case 'cross-bottom':
                                y1 += ch / 2;
                                r += `${l} x1="${x1}" y1="${y1}" x2="${x2}" y2="${y1}"/>\n`;
                                x1 += cw / 2;
                                r += `${l} x1="${x1}" y1="${y1}" x2="${x1}" y2="${y2}"/>\n`;
                                break;
                            case 'cross-left':
                                x1 += cw / 2; y1 += ch / 2;
                                r += `${l} x1="${x1}" y1="${y1}" x2="${x2}" y2="${y1}"/>\n`;
                                y1 -= ch / 2;
                                r += `${l} x1="${x1}" y1="${y1}" x2="${x1}" y2="${y2}"/>\n`;
                                break;
                            case 'cross-right':
                                x2 -= cw / 2; y1 += ch / 2;
                                r += `${l} x1="${x1}" y1="${y1}" x2="${x2}" y2="${y1}"/>\n`;
                                y1 -= ch / 2;
                                r += `${l} x1="${x2}" y1="${y1}" x2="${x2}" y2="${y2}"/>\n`;
                                break;
                        }
                        break;
                    case '.':
                        if (rightOf(i,j) == '-' && isVertical(belowOf(i,j))) {
                            // top left rounded corner
                            const o = 5;
                            x1 += cw / 2; y1 += ch / 2;
                            r += `${p} d="M ${x1} ${y2} Q ${x1+o} ${y1-o} ${x2} ${y1}"/>\n`;
                        } else if (leftOf(i,j) == '-') {
                            // top right rounded corner
                            x2 -= cw / 2; y1 += ch / 2;
                            r += `${p} d="M ${x1} ${y1} Q ${x1} ${y1} ${x2} ${y2}"/>\n`;
                        }
                        break;
                    case "'":
                        // to do
                        break;
                    case '>':
                        y2 -= ch / 2;
                        r += `${l} x1="${x1}" y1="${y2}" x2="${x2}" y2="${y2}" />\n`;
                        r += `${l} x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>\n`;
                        y1 += ch / 2; y2 += ch / 2;
                        r += `${l} x1="${x1}" y1="${y2}" x2="${x2}" y2="${y1}"/>\n`;
                        break;
                    case '<':
                        y1 += ch / 2;
                        r += `${l} x1="${x1}" y1="${y1}" x2="${x2}" y2="${y1}" />\n`;
                        y2 -= ch;
                        r += `${l} x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />\n`;
                        y2 += ch;
                        r += `${l} x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />\n`;
                        break;
                    case '^':
                        x1 += cw / 2;
                        r += `${l} x1="${x1}" y1="${y1}" x2="${x1}" y2="${y2}" />\n`;
                        x1 -= cw / 2; x2 -= cw / 2; y2 -= ch / 2;
                        r += `${l} x1="${x1}" y1="${y2}" x2="${x2}" y2="${y1}" />\n`;
                        x1 += cw / 2; x2 += cw / 2;
                        r += `${l} x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />\n`;
                        break;
                    case 'v':
                        if (i > 0 && j < lines[i-1].length && isVertical(aboveOf(i,j))) {
                            x1 += cw / 2;
                            r += `${l} x1="${x1}" y1="${y1}" x2="${x1}" y2="${y2}" />\n`;
                            x1 -= cw / 2; y1 += ch / 2; x2 -= cw / 2;
                            r += `${l} x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />\n`;
                            x1 += cw / 2; x2 += cw / 2;
                            r += `${l} x1="${x1}" y1="${y2}" x2="${x2}" y2="${y1}" />\n`;
                        }
                        break;
                }
            }
        }
        return r;
    }

    let svgLines = genLines();
    let svg = `<svg width="${(width+2)*cw}" height="${lines.length*ch}" ${ns}>\n`;
    return svg + genBgRects() + svgLines + genTexts() + style + '</svg>\n';;
}

/*
const example = 
`
  +------------+                   +------------+
  |#a   r1     |----------+------->|.b   r2     |
  +------------+          |        +------------+
                          +------->|.b   r3     |
                                   +------------+
                                   |.b   r4     |
                                   +------------+

<style>
#a {fill: azure;}
.b {fill: yellow;}
</style>
`;

console.log( diagram2svg(example) );
*/