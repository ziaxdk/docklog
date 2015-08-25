FROM elasticsearch

ENV NODE_VERSION 0.12.7
ENV NPM_VERSION 2.13.3
ENV DOCKLOG_PATH "/opt/docklog"

RUN curl -SLO "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.gz" \
  && tar -xzf "node-v$NODE_VERSION-linux-x64.tar.gz" -C /usr/local --strip-components=1 \
  && rm "node-v$NODE_VERSION-linux-x64.tar.gz" \
  && npm install -g npm@"$NPM_VERSION" \
  && npm cache clear

ADD parse.js .
RUN npm install event-stream

VOLUME ["/opt/docklog"]
EXPOSE 9200 9300 9400