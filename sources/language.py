from typing import List, Tuple, Type, Dict, Tuple
import re
import langid
import nltk
from nltk.sentiment.vader import SentimentIntensityAnalyzer
from transformers import MarianMTModel, MarianTokenizer

from sources.utility import pretty_print, animate_thinking

class LanguageUtility:
    """LanguageUtility for language, or emotion identification"""
    def __init__(self):
        self.sid = None 
        self.translators_tokenizer = None 
        self.translators_model = None
        self.load_model()
    
    def load_model(self) -> None:
        animate_thinking("Loading language utility...", color="status")
        try:
            nltk.data.find('vader_lexicon')
        except LookupError:
            nltk.download('vader_lexicon')
        self.sid = SentimentIntensityAnalyzer()
        self.translators_tokenizer = {
            "fr": MarianTokenizer.from_pretrained("Helsinki-NLP/opus-mt-fr-en"),
            "zh": MarianTokenizer.from_pretrained("Helsinki-NLP/opus-mt-zh-en")
        }
        self.translators_model = {
            "fr": MarianMTModel.from_pretrained("Helsinki-NLP/opus-mt-fr-en"),
            "zh": MarianMTModel.from_pretrained("Helsinki-NLP/opus-mt-zh-en")
        }
    
    def detect_language(self, text: str) -> str:
        """
        Detect the language of the given text using langdetect
        Args:
            text: string to analyze
        Returns: ISO639-1 language code
        """
        langid.set_languages(['fr', 'en', 'zh'])
        lang, score = langid.classify(text)
        return lang

    def translate(self, text: str, origin_lang: str) -> str:
        """
        Translate the given text to English
        Args:
            text: string to translate
            origin_lang: ISO language code
        Returns: translated str
        """
        if origin_lang == "en":
            return text
        if origin_lang not in self.translators_tokenizer:
            pretty_print(f"Language {origin_lang} not supported for translation", color="error")
            return text
        tokenizer = self.translators_tokenizer[origin_lang]
        inputs = tokenizer(text, return_tensors="pt", padding=True)
        model = self.translators_model[origin_lang]
        translation = model.generate(**inputs)
        return tokenizer.decode(translation[0], skip_special_tokens=True)

    def detect_emotion(self, text: str) -> str:
        """
        Detect the dominant emotion in the given text
        Args:
            text: string to analyze
        Returns: string of the dominant emotion
        """
        try:
            scores = self.sid.polarity_scores(text)
            emotions = {
                'Happy': max(scores['pos'], 0),
                'Angry': 0,
                'Sad': max(scores['neg'], 0),
                'Fear': 0,
                'Surprise': 0
            }
            if scores['compound'] < -0.5:
                emotions['Angry'] = abs(scores['compound']) * 0.5
                emotions['Fear'] = abs(scores['compound']) * 0.5
            elif scores['compound'] > 0.5:
                emotions['Happy'] = scores['compound']
                emotions['Surprise'] = scores['compound'] * 0.5
            dominant_emotion = max(emotions, key=emotions.get)
            if emotions[dominant_emotion] == 0:
                return 'Neutral'
            return dominant_emotion
        except Exception as e:
            raise e
    
    def analyze(self, text):
        """
        Combined analysis of language and emotion
        Args:
            text: string to analyze
        Returns: dictionary with language and emotion results
        """
        try:
            language = self.detect_language(text)
            emotions = self.detect_emotion(text)
            return {
                "language": language,
                "emotions": emotions
            }
        except Exception as e:
            raise e

if __name__ == "__main__":
    detector = LanguageUtility()
    
    test_texts = [
        "I am so happy today!",
        "我不要去巴黎",
        "La vie c'est cool"
    ]
    for text in test_texts:
        pretty_print("Analyzing...", color="status")
        pretty_print(f"Language: {detector.detect_language(text)}", color="status")
        result = detector.analyze(text)
        trans = detector.translate(text, result['language'])
        pretty_print(f"Translation: {trans} - from: {result['language']} - Emotion: {result['emotions']}")