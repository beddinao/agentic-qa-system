#/bin/bash

export HF_HOME="/hf_cache"
export HUGGINGFACE_HUB_CACHE="/hf_cache"

mkdir -p /hf_cache

if [ ! -f /deja ]; then
	python3 -m venv venv
	source venv/bin/activate

	pip install -U pip
	pip install -U -r requirements.txt

	echo "hold it" > /deja
else
	source venv/bin/activate
fi

python3 /backend/services/vector_store.py 
