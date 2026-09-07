// 抽選や画面表示から独立した、日本語プロンプトの組み立て処理。
window.buildPrompt = function buildPrompt(selection) {
  const { motif, technique, material, style, palette, composition, mood } = selection;
  const phrase = item => item.phrase || item.label;
  const paletteText = palette.associative
    ? `配色は「${palette.label}」から連想される${phrase(palette)}などを中心に、自然に解釈してください。`
    : `配色は${palette.label}を中心にしてください。指定色だけに限定する必要はありません。`;
  return [
    `${motif.label}を主役にした一枚のイラストを制作してください。`,
    `表現技法は${technique.label}とし、${phrase(technique)}を像を成立させる視覚表現として生かしてください。画材・素材には${material.label}の特徴である${phrase(material)}を取り入れ、技法の特徴と同じ画面の中で融合させてください。現実の制作工程として成立しなくても、どちらの特徴も省略しないでください。`,
    `造形には${phrase(style)}を取り入れてください。${paletteText}${phrase(composition)}。全体には「${mood.label}」という空気を持たせてください。`,
    `実物作品の撮影ではなく、平面イラストとして表現してください。写真的・実写的な表現や過度な写実・細密描写は避け、大きな形、色面、シルエット、線、素材感、余白、大きな模様や層の重なりで画面を豊かにしてください。素材感の豊かさを描き込み量に置き換えず、微細な要素の密集、大量の小物、過剰な装飾は避けてください。特定の既存作家・ブランド・作品を模倣しないでください。`,
  ].join("\n\n");
};
