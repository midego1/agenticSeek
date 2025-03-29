
from .generator import GeneratorLLM
from llama_cpp import Llama

class LlamacppLLM(GeneratorLLM):

    def __init__(self):
        """
        Handle generation using llama.cpp
        """
        super().__init__()
        self.llm = None
    
    def generate(self, history):
        if self.llm is None:
            self.llm = Llama.from_pretrained(
                repo_id=self.model,
                filename="*Q8_0.gguf",
                verbose=True
            )
            return
        self.logger.info(f"Using {self.model} for generation with Llama.cpp")
        self.llm.create_chat_completion(
              messages = history
        )