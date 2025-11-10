import os
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
from configs.openrouter import OpenRouterConfig


def create_openrouter_llm():
    return ChatOpenAI(
        model=OpenRouterConfig.MODEL,
        api_key=OpenRouterConfig.API_KEY,
        base_url=OpenRouterConfig.BASE_URL,
        default_headers=OpenRouterConfig.HEADERS,
        temperature=0,
        streaming=True
    )

def test_openrouter_configurations():
    print("--- [OPENROUTER]: testing connection..")
    try:
        messages = [HumanMessage(content="responde like a human would do. are you alive?")]
        llm = create_openrouter_llm()
        response = llm.stream(messages)
        for chunk in response:
            print(chunk.content, end="", flush=True)
        return True
    except Exception as e:
        print(f"--- [OPENROUTER]: missconfigured: {str(e)}")
        return False
