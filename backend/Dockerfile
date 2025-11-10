FROM debian:latest

RUN apt update -y && apt upgrade -y
RUN apt install -y vim ssh python3 python3-venv python3-dev

COPY . . 
RUN ls -al
RUN ls -al
RUN ls -al
RUN ls -al
RUN ls -al
RUN chmod +x setup.sh

CMD ["/bin/bash", "setup.sh"]
