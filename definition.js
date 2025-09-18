// Collins EN->CN (POS + EN with <b>word</b> + CN) — no-conflict class name
class my_encn_Collins_CN_ENWord_CN {
  constructor(options){ this.options=options; this.maxexample=2; this.word=''; }

  async displayName(){
    const locale = await api.locale();
    if (locale.indexOf('CN')!==-1) return 'Collins：词性+英文<b>word</b>+中文';
    if (locale.indexOf('TW')!==-1) return 'Collins：詞性+英文<b>word</b>+中文';
    return 'Collins EN->CN (POS + <b>word</b> + CN)';
  }

  setOptions(options){ this.options=options; this.maxexample=options.maxexample; }

  async findTerm(word){
    this.word=word;
    const stem = await api.deinflect(word) || [];
    if (word.toLowerCase()!==word){
      const lc = word.toLowerCase();
      const lcStem = await api.deinflect(lc) || [];
      const rs = await Promise.all([
        this.findCollins(word), this.findCollins(stem),
        this.findCollins(lc),   this.findCollins(lcStem)
      ]);
      return rs.flat().filter(Boolean);
    }
    const rs = await Promise.all([this.findCollins(word), this.findCollins(stem)]);
    return rs.flat().filter(Boolean);
  }

  // 把定义里出现的词头替换为 <b>word</b>；并把已有的 "the word" 也统一成 <b>word</b>
  replaceHeadwordHTML(html, headword){
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // 字母边界匹配（含大小写）
    const re = new RegExp(`(?<![A-Za-z])${esc(headword)}(?![A-Za-z])`, 'gi');
    try{
      const div = document.createElement('div');
      div.innerHTML = html;

      // 先把已有的粗体/斜体包裹的词头扁平化，避免嵌套 <b>
      div.innerHTML = div.innerHTML
        .replace(new RegExp(`<\\s*(b|i)\\s*>\\s*${esc(headword)}\\s*<\\s*/\\s*\\1\\s*>`, 'gi'), headword);

      // 遍历纯文本节点做替换
      const walker = document.createTreeWalker(div, NodeFilter.SHOW_TEXT, null);
      const nodes = [];
      let n; while ((n = walker.nextNode())) nodes.push(n);
      for (const node of nodes){
        if (re.test(node.nodeValue)){
          const parts = node.nodeValue.split(re);
          const frag = document.createDocumentFragment();
          for (let i=0;i<parts.length;i++){
            if (parts[i]) frag.appendChild(document.createTextNode(parts[i]));
            if (i < parts.length-1){
              const b = document.createElement('b');
              b.textContent = 'word';
              frag.appendChild(b);
            }
          }
          node.parentNode.replaceChild(frag, node);
        }
      }

      // 兜底：把已有的 "the word" 也统一成 <b>word</b>
      const s = div.innerHTML.replace(/\bthe\s+word\b/gi, '<b>word</b>');
      return s;
    }catch(e){
      // 无 DOM 环境时的纯字符串兜底
      return html
        .replace(re, '<b>word</b>')
        .replace(/\bthe\s+word\b/gi, '<b>word</b>');
    }
  }

  async findCollins(word){
    if (!word) return [];
    let result={};
    try{ result = JSON.parse(await api.getBuiltin('collins', word)); } catch { return []; }
    if (!result) return [];

    const expression = word;
    const reading = (result.readings && result.readings.length>0) ? `/${result.readings[0]}/` : '';
    const defs = result.defs || [];

    const definitions = [];
    for (const def of defs){
      const pos = def.pos_en ? `<span class="pos">${def.pos_en}</span>` : '';
      let eng = def.def_en ? this.replaceHeadwordHTML(def.def_en, expression) : '';
      eng = eng ? `<span class="eng_tran">${eng}</span>` : '';
      const chn = def.def_cn ? `<span class="chn_tran">${def.def_cn}</span>` : '';
      const line = `${pos}<span class="tran">${eng}${chn}</span>`;
      if (pos || eng || chn) definitions.push(line);
    }

    const css = this.renderCSS();
    return [{ css, expression, reading, definitions }];
  }

  renderCSS(){
    return `
<style>
  span.pos{ text-transform:lowercase;font-size:0.9em;margin-right:5px;padding:2px 4px;color:#fff;background:#0d47a1;border-radius:3px;}
  span.tran{ margin:0; padding:0;}
  span.eng_tran{ margin-right:6px; }
  span.chn_tran{ color:#0d47a1; }
</style>`;
  }
}
