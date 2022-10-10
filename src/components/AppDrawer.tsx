import {
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  styled,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import SettingsIcon from "@mui/icons-material/Settings";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ImageIcon from "@mui/icons-material/Image";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import FolderIcon from "@mui/icons-material/Folder";
import { useNavigate } from "react-router-dom";

export const DRAWER_WIDTH = 240;

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
  justifyContent: "flex-end",
}));

function AppDrawer({
  handleDrawerClose,
  open,
}: {
  handleDrawerClose: () => void;
  open: boolean;
}) {
  const navigate = useNavigate();

  return (
    <Drawer
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: DRAWER_WIDTH,
          boxSizing: "border-box",
        },
      }}
      variant="persistent"
      anchor="left"
      open={open}
    >
      <DrawerHeader>
        <IconButton onClick={handleDrawerClose}>
          <ChevronLeftIcon />
        </IconButton>
      </DrawerHeader>
      <Divider />
      <List>
        {[
          {
            text: "Wallet",
            to: "/",
            icon: <AccountBalanceWalletIcon />,
            disabled: false,
          },
          { text: "NFTs", to: "/nfts", icon: <ImageIcon />, disabled: false },
          { text: "xNFT", to: "/", icon: <SmartToyIcon />, disabled: true },
          {
            text: "All accounts",
            to: "/select-account",
            icon: <FolderIcon />,
            disabled: false,
          },
          {
            text: "Settings",
            to: "/settings",
            icon: <SettingsIcon />,
            disabled: false,
          },
        ].map(({ text, to, icon, disabled }) => (
          <ListItem key={text} disablePadding>
            <ListItemButton
              disabled={disabled}
              onClick={() => navigate(to, { replace: true })}
            >
              <ListItemIcon>{icon}</ListItemIcon>
              <ListItemText primary={text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
}

export default AppDrawer;
