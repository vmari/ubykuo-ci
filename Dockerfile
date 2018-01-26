FROM ubuntu

RUN apt-get update

ADD "ubykuo-ci_0.0.1-beta_all.deb" /

RUN apt-get install -y openssl git openssh-client curl
RUN curl -sL https://deb.nodesource.com/setup_6.x | bash
RUN apt-get install -y /ubykuo-ci_0.0.1-beta_all.deb
RUN rm /bin/sh && ln -s /bin/bash /bin/sh

EXPOSE 13316