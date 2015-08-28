FROM elasticsearch

ENV NODE_VERSION 0.12.7
ENV NPM_VERSION 2.13.3
ENV DOCKLOG_PATH "/opt/docklog"

COPY "./lib/node-v$NODE_VERSION-linux-x64.tar.gz" .
COPY "./lib/elasticsearch.yml" /usr/share/elasticsearch/config/

RUN tar -xzf "node-v$NODE_VERSION-linux-x64.tar.gz" -C /usr/local --strip-components=1 \
  && rm "node-v$NODE_VERSION-linux-x64.tar.gz" \
  && npm install -g npm@"$NPM_VERSION" \
  && npm cache clear

# RUN npm install -g pm2

COPY ./src ziax
COPY ./docker-entrypoint.sh /

WORKDIR ziax
RUN npm install
RUN npm install -g pm2

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["run"]

VOLUME ["/opt/docklog"]
EXPOSE 9200 9300

# docker build -t docklog .
# docker run -d --name docklog -p 9200:9200 -v //c/Users/keo/Desktop/docklog/import2:/opt/docklog docklog