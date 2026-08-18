-- Function to delete servers with no members
CREATE OR REPLACE FUNCTION delete_empty_servers()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the server has any members left
  IF (SELECT COUNT(*) FROM server_members WHERE server_id = OLD.server_id) = 0 THEN
    -- Delete the server
    DELETE FROM servers WHERE id = OLD.server_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically delete empty servers when a member leaves
DROP TRIGGER IF EXISTS delete_empty_server_on_leave ON server_members;
CREATE TRIGGER delete_empty_server_on_leave
AFTER DELETE ON server_members
FOR EACH ROW
EXECUTE FUNCTION delete_empty_servers();
