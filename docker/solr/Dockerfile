FROM solr:8.6.3

COPY --chown=0:0 --chmod=744 docker-entrypoint.sh /opt/docker-solr/scripts/docker-entrypoint.sh

VOLUME ["/var/solr"]

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["solr-foreground"]
