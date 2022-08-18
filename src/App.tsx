import { useState } from "react";
import "./App.css";
import {
  AppBar,
  Avatar,
  Box,
  IconButton,
  Stack,
  styled,
  Toolbar,
  Typography,
} from "@mui/material";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MenuIcon from "@mui/icons-material/Menu";

import AppDrawer, { DRAWER_WIDTH } from "./components/AppDrawer";
import { useNightlyConnect } from "./context/NightlyConnectProvider";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import Home from "./pages/Home";
import Nfts from "./pages/Nfts";

const Main = styled("main", { shouldForwardProp: (prop) => prop !== "open" })<{
  open?: boolean;
}>(({ theme, open }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create("margin", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: `-${DRAWER_WIDTH}px`,
  ...(open && {
    transition: theme.transitions.create("margin", {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
  }),
}));

function App() {
  const [open, setOpen] = useState(false);
  const { setOpenConnectDialog, connected } = useNightlyConnect();
  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar>
        <Toolbar>
          <IconButton onClick={handleDrawerOpen}>
            <MenuIcon />
          </IconButton>
          <Box m={1} sx={{ flexGrow: 1 }}>
            <Typography variant="h5">Desktop Wallet</Typography>
          </Box>
          <Stack direction="row" alignItems="center">
            <Avatar src="https://connect.nightly.app/img/logo.png" />
            {connected && <CheckIcon />}
            <IconButton onClick={() => setOpenConnectDialog(true)}>
              <AddIcon />
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>
      <Router>
        <AppDrawer handleDrawerClose={handleDrawerClose} open={open} />
        <Box>
          <Main open={open}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/nfts" element={<Nfts />} />
            </Routes>
          </Main>
        </Box>
      </Router>
    </Box>
  );
}

export default App;
