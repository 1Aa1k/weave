declare module "wink-pos-tagger" {
  interface WinkToken {
    value: string;
    tag: string;
    normal: string;
    pos: string;
  }
  interface Tagger {
    tagSentence(sentence: string): WinkToken[];
  }
  export default function posTagger(): Tagger;
}

declare module "wink-lemmatizer" {
  const lemmatizer: {
    noun(word: string): string;
    verb(word: string): string;
    adjective(word: string): string;
  };
  export default lemmatizer;
}
